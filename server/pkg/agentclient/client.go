package agentclient

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"sync"
	"sync/atomic"

	"instavault-server/pkg/adapters/nativehost"
	"instavault-server/pkg/agent"
)

const maxFrameSize = 8 * 1024 * 1024

type connector func(context.Context, string, agent.StartAgent) (net.Conn, error)

type response struct {
	frame nativehost.Envelope
	err   error
}

type ConnectionStatus struct {
	Connected bool   `json:"connected"`
	Error     string `json:"error,omitempty"`
}

type RemoteError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable"`
}

func (remote *RemoteError) Error() string {
	if remote.Code == "" {
		return remote.Message
	}
	return remote.Code + ": " + remote.Message
}

type Client struct {
	endpoint string
	start    agent.StartAgent
	connect  connector

	connectMu  sync.Mutex
	writeMu    sync.Mutex
	mu         sync.Mutex
	connection net.Conn
	pending    map[string]chan response
	closed     bool
	nextID     atomic.Uint64

	events   chan nativehost.Envelope
	statuses chan ConnectionStatus
}

func New(endpoint string, start agent.StartAgent) *Client {
	return newClient(endpoint, start, agent.ConnectOrStart)
}

func newClient(endpoint string, start agent.StartAgent, connect connector) *Client {
	return &Client{
		endpoint: endpoint,
		start:    start,
		connect:  connect,
		pending:  make(map[string]chan response),
		events:   make(chan nativehost.Envelope, 256),
		statuses: make(chan ConnectionStatus, 16),
	}
}

func (client *Client) Events() <-chan nativehost.Envelope {
	return client.events
}

func (client *Client) Statuses() <-chan ConnectionStatus {
	return client.statuses
}

func (client *Client) Connected() bool {
	client.mu.Lock()
	defer client.mu.Unlock()
	return client.connection != nil && !client.closed
}

func (client *Client) Connect(ctx context.Context) error {
	client.connectMu.Lock()
	defer client.connectMu.Unlock()

	client.mu.Lock()
	if client.closed {
		client.mu.Unlock()
		return errors.New("agent client is closed")
	}
	if client.connection != nil {
		client.mu.Unlock()
		return nil
	}
	client.mu.Unlock()

	connection, err := client.connect(ctx, client.endpoint, client.start)
	if err != nil {
		client.publishStatus(ConnectionStatus{Error: err.Error()})
		return err
	}

	client.mu.Lock()
	if client.closed {
		client.mu.Unlock()
		_ = connection.Close()
		return errors.New("agent client is closed")
	}
	client.connection = connection
	client.mu.Unlock()
	client.publishStatus(ConnectionStatus{Connected: true})
	go client.readLoop(connection)
	return nil
}

func (client *Client) Request(ctx context.Context, messageType string, payload any, target any) error {
	if err := client.Connect(ctx); err != nil {
		return err
	}

	requestID := fmt.Sprintf("desktop-%d", client.nextID.Add(1))
	frame := nativehost.Envelope{
		Protocol: nativehost.ProtocolVersion,
		ID:       requestID,
		Kind:     "request",
		Type:     messageType,
	}
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("encode %s payload: %w", messageType, err)
		}
		frame.Payload = data
	}

	result := make(chan response, 1)
	client.mu.Lock()
	connection := client.connection
	if connection == nil {
		client.mu.Unlock()
		return errors.New("agent connection is unavailable")
	}
	client.pending[requestID] = result
	client.mu.Unlock()

	client.writeMu.Lock()
	err := writeFrame(connection, frame)
	client.writeMu.Unlock()
	if err != nil {
		client.removePending(requestID)
		client.disconnect(connection, err)
		return err
	}

	select {
	case <-ctx.Done():
		client.removePending(requestID)
		return ctx.Err()
	case reply := <-result:
		if reply.err != nil {
			return reply.err
		}
		if reply.frame.OK == nil || !*reply.frame.OK {
			remote := &RemoteError{Message: "agent request failed"}
			if reply.frame.Error != nil {
				remote.Code = reply.frame.Error.Code
				remote.Message = reply.frame.Error.Message
				remote.Retryable = reply.frame.Error.Retryable
			}
			return remote
		}
		if target != nil && len(reply.frame.Payload) > 0 {
			if err := json.Unmarshal(reply.frame.Payload, target); err != nil {
				return fmt.Errorf("decode %s response: %w", messageType, err)
			}
		}
		return nil
	}
}

func (client *Client) Close() error {
	client.connectMu.Lock()
	defer client.connectMu.Unlock()

	client.mu.Lock()
	if client.closed {
		client.mu.Unlock()
		return nil
	}
	client.closed = true
	connection := client.connection
	client.connection = nil
	pending := client.pending
	client.pending = make(map[string]chan response)
	client.mu.Unlock()

	if connection != nil {
		_ = connection.Close()
	}
	for _, waiter := range pending {
		waiter <- response{err: errors.New("agent client closed")}
	}
	return nil
}

func (client *Client) readLoop(connection net.Conn) {
	for {
		frame, err := readFrame(connection)
		if err != nil {
			client.disconnect(connection, err)
			return
		}
		switch frame.Kind {
		case "response":
			client.mu.Lock()
			waiter := client.pending[frame.ID]
			delete(client.pending, frame.ID)
			client.mu.Unlock()
			if waiter != nil {
				waiter <- response{frame: frame}
			}
		case "event":
			client.publishEvent(frame)
		}
	}
}

func (client *Client) disconnect(connection net.Conn, cause error) {
	client.mu.Lock()
	if client.connection != connection {
		client.mu.Unlock()
		return
	}
	client.connection = nil
	pending := client.pending
	client.pending = make(map[string]chan response)
	closed := client.closed
	client.mu.Unlock()
	_ = connection.Close()

	transportErr := fmt.Errorf("agent connection closed: %w", cause)
	for _, waiter := range pending {
		waiter <- response{err: transportErr}
	}
	if !closed {
		client.publishStatus(ConnectionStatus{Error: cause.Error()})
	}
}

func (client *Client) removePending(requestID string) {
	client.mu.Lock()
	delete(client.pending, requestID)
	client.mu.Unlock()
}

func (client *Client) publishEvent(frame nativehost.Envelope) {
	select {
	case client.events <- frame:
	default:
		select {
		case <-client.events:
		default:
		}
		select {
		case client.events <- frame:
		default:
		}
	}
}

func (client *Client) publishStatus(status ConnectionStatus) {
	select {
	case client.statuses <- status:
	default:
		select {
		case <-client.statuses:
		default:
		}
		select {
		case client.statuses <- status:
		default:
		}
	}
}

func readFrame(reader io.Reader) (nativehost.Envelope, error) {
	var length uint32
	if err := binary.Read(reader, binary.LittleEndian, &length); err != nil {
		return nativehost.Envelope{}, err
	}
	if length == 0 || length > maxFrameSize {
		return nativehost.Envelope{}, fmt.Errorf("invalid agent frame length: %d", length)
	}
	data := make([]byte, length)
	if _, err := io.ReadFull(reader, data); err != nil {
		return nativehost.Envelope{}, err
	}
	var frame nativehost.Envelope
	if err := json.Unmarshal(data, &frame); err != nil {
		return nativehost.Envelope{}, fmt.Errorf("decode agent frame: %w", err)
	}
	return frame, nil
}

func writeFrame(writer io.Writer, frame nativehost.Envelope) error {
	data, err := json.Marshal(frame)
	if err != nil {
		return fmt.Errorf("encode agent frame: %w", err)
	}
	if len(data) == 0 || len(data) > maxFrameSize {
		return fmt.Errorf("invalid outbound agent frame length: %d", len(data))
	}
	if err := binary.Write(writer, binary.LittleEndian, uint32(len(data))); err != nil {
		return fmt.Errorf("write agent frame length: %w", err)
	}
	for len(data) > 0 {
		written, err := writer.Write(data)
		if err != nil {
			return fmt.Errorf("write agent frame: %w", err)
		}
		if written == 0 {
			return io.ErrShortWrite
		}
		data = data[written:]
	}
	return nil
}
