package agent

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"net"
	"testing"
	"time"

	"instavault-server/pkg/adapters/nativehost"
)

func TestServerHandlesHandshakeAndClosesActiveClients(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(listener, nil, nil, nil)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- server.Serve(ctx) }()

	connection, err := net.Dial("tcp", listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()
	_ = connection.SetDeadline(time.Now().Add(2 * time.Second))

	request := nativehost.Envelope{
		Protocol: nativehost.ProtocolVersion,
		ID:       "agent-handshake",
		Kind:     "request",
		Type:     "session.hello",
	}
	data, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	if err := binary.Write(connection, binary.LittleEndian, uint32(len(data))); err != nil {
		t.Fatal(err)
	}
	if _, err := connection.Write(data); err != nil {
		t.Fatal(err)
	}

	var responseLength uint32
	if err := binary.Read(connection, binary.LittleEndian, &responseLength); err != nil {
		t.Fatal(err)
	}
	responseData := make([]byte, responseLength)
	if _, err := io.ReadFull(connection, responseData); err != nil {
		t.Fatal(err)
	}
	var response nativehost.Envelope
	if err := json.Unmarshal(responseData, &response); err != nil {
		t.Fatal(err)
	}
	if response.ID != request.ID || response.OK == nil || !*response.OK {
		t.Fatalf("unexpected handshake response: %+v", response)
	}

	cancel()
	if err := server.Close(); err != nil && !isClosedNetworkError(err) {
		t.Fatalf("Close: %v", err)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("Serve: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("server did not stop with an active client")
	}
}

func isClosedNetworkError(err error) bool {
	return errors.Is(err, net.ErrClosed)
}
