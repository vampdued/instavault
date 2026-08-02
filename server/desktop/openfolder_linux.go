//go:build linux

package main

import (
	"os/exec"
	"path/filepath"
)

func openFolder(path string) error {
	command := exec.Command("xdg-open", path)
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}

func openFile(path string) error {
	return openFolder(path)
}

func showInFolder(path string) error {
	return openFolder(filepath.Dir(path))
}
