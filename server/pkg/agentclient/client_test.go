package agentclient

import (
	"context"
	"encoding/json"
	"net"
	"testing"
	"time"

	"instavault-server/pkg/adapters/nativehost"
	"instavault-server/pkg/agent"
	"instavault-server/pkg/domain"
)

func TestRequestAndEventDelivery(t *testing.T) {
	clientConnection, serverConnection := net.Pipe()
	defer serverConnection.Close()
	used := false
	client := newClient("test", nil, func(context.Context, string, agent.StartAgent) (net.Conn, error) {
		if used {
			t.Fatal("connector called more than once")
		}
		used = true
		return clientConnection, nil
	})
	defer client.Close()

	go func() {
		request, err := readFrame(serverConnection)
		if err != nil {
			return
		}
		_ = writeFrame(serverConnection, nativehost.Envelope{
			Protocol: nativehost.ProtocolVersion,
			Kind:     "event",
			Type:     "download.progress",
			Sequence: 1,
			Payload:  json.RawMessage(`{"jobId":"job-1","progressPercent":42}`),
		})
		ok := true
		payload, _ := json.Marshal(domain.QueueSnapshot{Queued: 2, Jobs: []domain.Job{}})
		_ = writeFrame(serverConnection, nativehost.Envelope{
			Protocol: nativehost.ProtocolVersion,
			ID:       request.ID,
			Kind:     "response",
			Type:     request.Type,
			OK:       &ok,
			Payload:  payload,
		})
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	var snapshot domain.QueueSnapshot
	if err := client.Request(ctx, "queue.get", nil, &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Queued != 2 {
		t.Fatalf("queued = %d; want 2", snapshot.Queued)
	}
	select {
	case event := <-client.Events():
		if event.Type != "download.progress" || event.Sequence != 1 {
			t.Fatalf("unexpected event: %+v", event)
		}
	case <-ctx.Done():
		t.Fatal("event was not delivered")
	}
}

func TestRemoteError(t *testing.T) {
	clientConnection, serverConnection := net.Pipe()
	defer serverConnection.Close()
	client := newClient("test", nil, func(context.Context, string, agent.StartAgent) (net.Conn, error) {
		return clientConnection, nil
	})
	defer client.Close()

	go func() {
		request, _ := readFrame(serverConnection)
		ok := false
		_ = writeFrame(serverConnection, nativehost.Envelope{
			Protocol: nativehost.ProtocolVersion,
			ID:       request.ID,
			Kind:     "response",
			Type:     request.Type,
			OK:       &ok,
			Error:    &nativehost.ProtocolError{Code: "JOB_NOT_CANCELABLE", Message: "already complete"},
		})
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	err := client.Request(ctx, "download.cancel", map[string]string{"jobId": "job-1"}, nil)
	remote, ok := err.(*RemoteError)
	if !ok || remote.Code != "JOB_NOT_CANCELABLE" {
		t.Fatalf("unexpected error: %T %v", err, err)
	}
}
