//go:build !windows

package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

var unixLockFile *os.File

func acquireSingleInstanceMutex(name string) (bool, error) {
	lockPath := filepath.Join(os.TempDir(), sanitize(name)+".lock")
	f, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		return false, err
	}
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		_ = f.Close()
		if errors.Is(err, syscall.EWOULDBLOCK) || errors.Is(err, syscall.EAGAIN) {
			return false, nil
		}
		return false, err
	}
	unixLockFile = f
	return true, nil
}

func releaseSingleInstanceMutex() {
	if unixLockFile != nil {
		_ = syscall.Flock(int(unixLockFile.Fd()), syscall.LOCK_UN)
		_ = unixLockFile.Close()
		unixLockFile = nil
	}
}

func waitForProcessExit(pid int, timeout time.Duration) error {
	if pid <= 0 {
		return nil
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		err := syscall.Kill(pid, 0)
		if errors.Is(err, syscall.ESRCH) {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for PID %d to terminate", pid)
}

func redirectStdHandles(logFile *os.File) error {
	os.Stderr = logFile
	os.Stdout = logFile
	return nil
}

func spawnDetachedProcess(cmd *exec.Cmd) error {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	return cmd.Start()
}

// noWindowCmd is a no-op on Unix; console visibility is not a concern there.
func noWindowCmd(_ *exec.Cmd) {}
