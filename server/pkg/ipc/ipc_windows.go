//go:build windows

package ipc

import (
	"context"
	"crypto/sha256"
	"fmt"
	"net"

	"github.com/Microsoft/go-winio"
	"golang.org/x/sys/windows"
)

func currentUserSID() (string, error) {
	token := windows.GetCurrentProcessToken()
	user, err := token.GetTokenUser()
	if err != nil {
		return "", fmt.Errorf("get current user SID: %w", err)
	}
	return user.User.Sid.String(), nil
}

func DefaultEndpoint() (string, error) {
	sid, err := currentUserSID()
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256([]byte(sid))
	return fmt.Sprintf(`\\.\pipe\instavault-agent-%x`, digest[:8]), nil
}

func Listen(endpoint string) (net.Listener, error) {
	sid, err := currentUserSID()
	if err != nil {
		return nil, err
	}
	config := &winio.PipeConfig{
		SecurityDescriptor: fmt.Sprintf("D:P(A;;GA;;;SY)(A;;GA;;;%s)", sid),
		MessageMode:        false,
		InputBufferSize:    64 * 1024,
		OutputBufferSize:   64 * 1024,
	}
	listener, err := winio.ListenPipe(endpoint, config)
	if err != nil {
		return nil, fmt.Errorf("listen on agent named pipe: %w", err)
	}
	return listener, nil
}

func Dial(ctx context.Context, endpoint string) (net.Conn, error) {
	connection, err := winio.DialPipeContext(ctx, endpoint)
	if err != nil {
		return nil, fmt.Errorf("connect to agent named pipe: %w", err)
	}
	return connection, nil
}
