//go:build windows

package main

import (
	"path/filepath"
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

func openFile(path string) error {
	command := exec.Command("explorer.exe", path)
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}

func showInFolder(path string) error {
	command := exec.Command("explorer.exe", "/select,", filepath.Clean(path))
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}
