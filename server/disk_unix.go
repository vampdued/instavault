//go:build !windows

package main

import (
	"os"
	"path/filepath"
	"syscall"
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
	var stat syscall.Statfs_t
	err = syscall.Statfs(absPath, &stat)
	if err != nil {
		return 0, 0, err
	}
	total = stat.Blocks * uint64(stat.Bsize)
	free = stat.Bavail * uint64(stat.Bsize)
	return total, free, nil
}
