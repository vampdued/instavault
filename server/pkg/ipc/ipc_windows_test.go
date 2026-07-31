//go:build windows

package ipc

import (
	"context"
	"fmt"
	"io"
	"os"
	"testing"
	"time"
)

func TestNamedPipeRoundTrip(t *testing.T) {
	endpoint := fmt.Sprintf(`\\.\pipe\instavault-test-%d-%d`, os.Getpid(), time.Now().UnixNano())
	listener, err := Listen(endpoint)
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	if duplicate, err := Listen(endpoint); err == nil {
		_ = duplicate.Close()
		t.Fatal("second listener unexpectedly acquired the same named pipe")
	}

	accepted := make(chan error, 1)
	go func() {
		connection, err := listener.Accept()
		if err != nil {
			accepted <- err
			return
		}
		defer connection.Close()
		buffer := make([]byte, 4)
		_, err = io.ReadFull(connection, buffer)
		if err == nil && string(buffer) != "ping" {
			err = fmt.Errorf("received %q", buffer)
		}
		accepted <- err
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	connection, err := Dial(ctx, endpoint)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := connection.Write([]byte("ping")); err != nil {
		t.Fatal(err)
	}
	_ = connection.Close()
	if err := <-accepted; err != nil {
		t.Fatal(err)
	}
}
