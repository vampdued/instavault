//go:build linux

package main

import "os/exec"

func openFolder(path string) error {
	command := exec.Command("xdg-open", path)
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}
