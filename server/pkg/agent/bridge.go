package agent

import (
	"context"
	"fmt"
	"io"
	"net"
	"time"

	"instavault-server/pkg/ipc"
)

type StartAgent func() error

func ConnectOrStart(ctx context.Context, endpoint string, start StartAgent) (net.Conn, error) {
	attemptCtx, cancel := context.WithTimeout(ctx, 250*time.Millisecond)
	connection, err := ipc.Dial(attemptCtx, endpoint)
	cancel()
	if err == nil {
		return connection, nil
	}
	if err := start(); err != nil {
		return nil, fmt.Errorf("start InstaVault agent: %w", err)
	}

	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		attemptCtx, cancel = context.WithTimeout(ctx, 500*time.Millisecond)
		connection, err = ipc.Dial(attemptCtx, endpoint)
		cancel()
		if err == nil {
			return connection, nil
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(100 * time.Millisecond):
		}
	}
	return nil, fmt.Errorf("agent did not become ready: %w", err)
}

func Bridge(ctx context.Context, endpoint string, input io.Reader, output io.Writer, start StartAgent) error {
	connection, err := ConnectOrStart(ctx, endpoint, start)
	if err != nil {
		return err
	}
	defer connection.Close()

	errors := make(chan error, 2)
	go func() {
		_, copyErr := io.Copy(connection, input)
		if closeWriter, ok := connection.(interface{ CloseWrite() error }); ok {
			_ = closeWriter.CloseWrite()
		}
		errors <- copyErr
	}()
	go func() {
		_, copyErr := io.Copy(output, connection)
		errors <- copyErr
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-errors:
		return err
	}
}
