# InstaVault

InstaVault is a local-first Instagram media archiver consisting of a browser extension and a local daemon that stores media on disk and tracks download history to prevent duplicate downloads.

## Language

**Vault Backup**:
A portable, user-initiated export of the InstaVault database used to migrate history between machines or recover after a reinstall.
_Avoid_: Database dump, export file, manual backup

**Safety Snapshot**:
An automatic, server-managed copy of the live database saved before destructive operations such as schema migrations or imports.
_Avoid_: Auto-backup, migration backup, rollback file

**Vault Store**:
The canonical record of archived media, skipped items, tracked accounts, and local archive settings, including lifecycle management for Safety Snapshots and Vault Backups.
_Avoid_: DB layer, database helper, storage service

**Media Downloader**:
The ingestion pipeline that validates media sources, prevents duplicate archives, acquires media assets onto local disk, and records outcomes across normal, forced, and retry downloads.
_Avoid_: Download handler, fetch helper, media service

**Sync Hub**:
The live coordination center that tracks active archiving sessions, maintains recent activity logs, expires idle sessions, and streams real-time status updates to connected clients.
_Avoid_: SSE manager, telemetry globals, status service

**Story Acquisition**:
The discovery and normalization of Instagram stories, highlights, and active slides into canonical media items ready for archiving.
_Avoid_: Story scraper, GraphQL wrapper, story fallback

**Feed Fetcher**:
The background retrieval engine that fetches and normalizes Instagram posts, profiles, reels, saved collections, highlights lists, and explore feeds for archiving.
_Avoid_: Background scraper, GraphQL helper, feed service
