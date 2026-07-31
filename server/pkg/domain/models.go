package domain

import "time"

type DownloadRequest struct {
	ID         string `json:"id,omitempty"`
	Username   string `json:"username"`
	AccountID  string `json:"accountId,omitempty"`
	Shortcode  string `json:"shortcode"`
	URL        string `json:"url"`
	Filename   string `json:"filename,omitempty"`
	FileExt    string `json:"fileExt,omitempty"`
	TakenAt    int64  `json:"takenAt,omitempty"`
	IsThumb    bool   `json:"isThumb,omitempty"`
	PageType   string `json:"pageType,omitempty"`
	MediaIndex int    `json:"index,omitempty"`
}

type DownloadResult struct {
	JobID     string `json:"jobId,omitempty"`
	Status    string `json:"status"` // "downloaded", "skipped", "error"
	Message   string `json:"message,omitempty"`
	LocalPath string `json:"localPath,omitempty"`
	Shortcode string `json:"shortcode"`
	Filename  string `json:"filename,omitempty"`
	FileSize  int64  `json:"fileSize,omitempty"`
}

type JobState string

const (
	JobQueued    JobState = "queued"
	JobRunning   JobState = "running"
	JobCompleted JobState = "completed"
	JobSkipped   JobState = "skipped"
	JobFailed    JobState = "failed"
	JobCanceled  JobState = "canceled"
)

type Job struct {
	ID        string          `json:"id"`
	State     JobState        `json:"state"`
	Request   DownloadRequest `json:"request"`
	Result    *DownloadResult `json:"result,omitempty"`
	Error     string          `json:"error,omitempty"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

type QueueSnapshot struct {
	Paused  bool  `json:"paused"`
	Queued  int   `json:"queued"`
	Running int   `json:"running"`
	Jobs    []Job `json:"jobs"`
}

type SkipEntry struct {
	ID        int    `json:"id"`
	Shortcode string `json:"shortcode"`
	Username  string `json:"username"`
	Filename  string `json:"filename"`
	LocalPath string `json:"localPath"`
	SkippedAt string `json:"skippedAt"`
}

type DownloadEntry struct {
	ID           int    `json:"id"`
	Shortcode    string `json:"shortcode"`
	Username     string `json:"username"`
	Filename     string `json:"filename"`
	LocalPath    string `json:"localPath"`
	FileSize     int64  `json:"fileSize"`
	Downloaded   string `json:"downloadedAt"`
	RelativePath string `json:"relativePath"`
}

type LiveLogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Username  string    `json:"username"`
	Filename  string    `json:"filename"`
	Shortcode string    `json:"shortcode"`
	Status    string    `json:"status"` // "downloading", "completed", "skipped", "failed"
	Size      int64     `json:"size,omitempty"`
	Error     string    `json:"error,omitempty"`
}

type ActiveSyncState struct {
	LastActive time.Time      `json:"lastActive"`
	Username   string         `json:"username"`
	IsActive   bool           `json:"isActive"`
	LiveLogs   []LiveLogEntry `json:"liveLogs"`
}

type StatsResponse struct {
	TotalDownloads int             `json:"totalDownloads"`
	TotalSkipped   int             `json:"totalSkipped"`
	UniqueAccounts int             `json:"uniqueAccounts"`
	ActiveSync     ActiveSyncState `json:"activeSync"`
	DiskTotal      uint64          `json:"diskTotal"`
	DiskFree       uint64          `json:"diskFree"`
}

type Settings struct {
	BaseDir         string `json:"baseDir"`
	FolderStructure string `json:"folderStructure"`
}

type AccountStat struct {
	Username string `json:"username"`
	Count    int    `json:"count"`
}
