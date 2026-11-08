//go:build !windows

package main

import (
	"os"
	"os/exec"
	"time"
)

func acquireSingleInstanceMutex(name string) (bool, error) {
	// Mutex is Windows-specific; Unix relies on PID files / systemd unit singletons
	return true, nil
}

func releaseSingleInstanceMutex() {
}

func waitForProcessExit(pid int, timeout time.Duration) error {
	// Stub for Unix process wait
	return nil
}

func redirectStdHandles(logFile *os.File) error {
	os.Stderr = logFile
	os.Stdout = logFile
	return nil
}

func spawnDetachedProcess(cmd *exec.Cmd) error {
	return cmd.Start()
}
