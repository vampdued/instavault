//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

func openFolder(path string) error {
	command := exec.Command("explorer.exe", path)
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}
