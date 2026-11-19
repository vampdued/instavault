//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"time"

	"golang.org/x/sys/windows"
)

var singleInstanceMutex windows.Handle

// acquireSingleInstanceMutex attempts to create a named Windows Mutex.
// Returns (true, nil) if successfully acquired; (false, nil) if already running.
func acquireSingleInstanceMutex(name string) (bool, error) {
	namePtr, err := windows.UTF16PtrFromString(name)
	if err != nil {
		return false, err
	}

	h, err := windows.CreateMutex(nil, true, namePtr)
	if err != nil {
		// If CreateMutex returns ERROR_ALREADY_EXISTS, another instance already holds the mutex
		if err == windows.ERROR_ALREADY_EXISTS {
			if h != 0 {
				_ = windows.CloseHandle(h)
			}
			return false, nil
		}
		return false, err
	}

	singleInstanceMutex = h
	return true, nil
}

// releaseSingleInstanceMutex frees and closes the mutex handle.
func releaseSingleInstanceMutex() {
	if singleInstanceMutex != 0 {
		_ = windows.ReleaseMutex(singleInstanceMutex)
		_ = windows.CloseHandle(singleInstanceMutex)
		singleInstanceMutex = 0
	}
}

// waitForProcessExit waits up to timeout for the specified PID to terminate.
func waitForProcessExit(pid int, timeout time.Duration) error {
	if pid <= 0 {
		return nil
	}

	handle, err := windows.OpenProcess(windows.SYNCHRONIZE, false, uint32(pid))
	if err != nil {
		// If process cannot be opened (e.g. invalid or already terminated), proceed safely
		return nil
	}
	defer windows.CloseHandle(handle)

	ms := uint32(timeout.Milliseconds())
	event, err := windows.WaitForSingleObject(handle, ms)
	if err != nil {
		return err
	}
	if event == uint32(windows.WAIT_TIMEOUT) {
		return fmt.Errorf("timeout waiting for PID %d to terminate", pid)
	}
	return nil
}

// redirectStdHandles redirects OS-level stdout and stderr handles to the log file.
// This ensures panics and CGO/runtime outputs from -H=windowsgui are captured on disk.
func redirectStdHandles(logFile *os.File) error {
	handle := windows.Handle(logFile.Fd())
	_ = windows.SetStdHandle(windows.STD_ERROR_HANDLE, handle)
	_ = windows.SetStdHandle(windows.STD_OUTPUT_HANDLE, handle)
	os.Stderr = logFile
	os.Stdout = logFile
	return nil
}

// spawnDetachedProcess starts a child process completely decoupled from this console/session.
func spawnDetachedProcess(cmd *exec.Cmd) error {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.CreationFlags |= windows.CREATE_NEW_PROCESS_GROUP | windows.DETACHED_PROCESS
	return cmd.Start()
}
