//go:build darwin

package main

import "os/exec"

func openFolder(path string) error {
	command := exec.Command("open", path)
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}

func openFile(path string) error {
	return openFolder(path)
}

func showInFolder(path string) error {
	command := exec.Command("open", "-R", path)
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}
