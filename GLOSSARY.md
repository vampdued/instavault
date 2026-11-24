# InstaVault

InstaVault is a local-first Instagram media archiver consisting of a browser extension and a local daemon that stores media on disk and tracks download history to prevent duplicate downloads.

## Language

**Vault Backup**:
A portable, user-initiated export of the InstaVault database used to migrate history between machines or recover after a reinstall.
_Avoid_: Database dump, export file, manual backup

**Safety Snapshot**:
An automatic, server-managed copy of the live database saved before destructive operations such as schema migrations or imports.
_Avoid_: Auto-backup, migration backup, rollback file
