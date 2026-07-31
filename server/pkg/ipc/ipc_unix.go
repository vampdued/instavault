//go:build !windows

package ipc

import (
	"context"
	"fmt"
	"net"
	"os"
	"path/filepath"

	"golang.org/x/sys/unix"
)

type unixListener struct {
	net.Listener
	path     string
	lockFile *os.File
}

func (listener *unixListener) Close() error {
	err := listener.Listener.Close()
	_ = os.Remove(listener.path)
	_ = unix.Flock(int(listener.lockFile.Fd()), unix.LOCK_UN)
	_ = listener.lockFile.Close()
	return err
}

func DefaultEndpoint() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve user config directory: %w", err)
	}
	directory := filepath.Join(configDir, "instavault")
	if err := os.MkdirAll(directory, 0700); err != nil {
		return "", fmt.Errorf("create IPC directory: %w", err)
	}
	if err := os.Chmod(directory, 0700); err != nil {
		return "", fmt.Errorf("secure IPC directory: %w", err)
	}
	return filepath.Join(directory, "agent.sock"), nil
}

func Listen(endpoint string) (net.Listener, error) {
	lockPath := endpoint + ".lock"
	lockFile, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, fmt.Errorf("open agent lock: %w", err)
	}
	if err := os.Chmod(lockPath, 0600); err != nil {
		_ = lockFile.Close()
		return nil, fmt.Errorf("secure agent lock: %w", err)
	}
	if err := unix.Flock(int(lockFile.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		_ = lockFile.Close()
		return nil, fmt.Errorf("agent is already running: %w", err)
	}
	if err := os.Remove(endpoint); err != nil && !os.IsNotExist(err) {
		_ = unix.Flock(int(lockFile.Fd()), unix.LOCK_UN)
		_ = lockFile.Close()
		return nil, fmt.Errorf("remove stale IPC socket: %w", err)
	}
	listener, err := net.Listen("unix", endpoint)
	if err != nil {
		_ = unix.Flock(int(lockFile.Fd()), unix.LOCK_UN)
		_ = lockFile.Close()
		return nil, fmt.Errorf("listen on agent socket: %w", err)
	}
	if err := os.Chmod(endpoint, 0600); err != nil {
		_ = listener.Close()
		_ = os.Remove(endpoint)
		_ = unix.Flock(int(lockFile.Fd()), unix.LOCK_UN)
		_ = lockFile.Close()
		return nil, fmt.Errorf("secure agent socket: %w", err)
	}
	return &unixListener{Listener: listener, path: endpoint, lockFile: lockFile}, nil
}

func Dial(ctx context.Context, endpoint string) (net.Conn, error) {
	dialer := net.Dialer{}
	connection, err := dialer.DialContext(ctx, "unix", endpoint)
	if err != nil {
		return nil, fmt.Errorf("connect to agent socket: %w", err)
	}
	return connection, nil
}
