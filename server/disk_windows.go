//go:build windows

package main

import (
	"os"
	"path/filepath"

	"golang.org/x/sys/windows"
)

func getDiskUsage(path string) (total uint64, free uint64, err error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		absPath = path
	}
	// Traverse up to find existing parent directory if target doesn't exist yet
	for {
		if _, err := os.Stat(absPath); err == nil {
			break
		}
		parent := filepath.Dir(absPath)
		if parent == absPath {
			break
		}
		absPath = parent
	}
	pathPtr, err := windows.UTF16PtrFromString(absPath)
	if err != nil {
		return 0, 0, err
	}
	var freeBytesAvailable, totalBytes, totalFreeBytes uint64
	err = windows.GetDiskFreeSpaceEx(pathPtr, &freeBytesAvailable, &totalBytes, &totalFreeBytes)
	if err != nil {
		return 0, 0, err
	}
	return totalBytes, freeBytesAvailable, nil
}
