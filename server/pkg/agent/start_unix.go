//go:build !windows

package agent

import (
	"os"
	"os/exec"
	"syscall"
)

func StartDetached(executable, logPath string) error {
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	command := exec.Command(executable, "--agent")
	command.Stdin = nil
	command.Stdout = logFile
	command.Stderr = logFile
	command.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := command.Start(); err != nil {
		_ = logFile.Close()
		return err
	}
	_ = logFile.Close()
	return command.Process.Release()
}
