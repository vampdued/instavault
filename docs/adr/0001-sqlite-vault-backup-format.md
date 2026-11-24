# Use raw SQLite (.db) via VACUUM INTO as the Vault Backup format

We use a single self-contained SQLite `.db` file produced atomically via `VACUUM INTO` as the canonical format for Vault Backups instead of a custom JSON export. Because InstaVault's database can grow to tens of thousands of download records and already uses `VACUUM INTO` for Safety Snapshots, raw SQLite guarantees atomic, WAL-free snapshots with exact schema and timestamp fidelity while reusing existing schema version (`PRAGMA user_version`) checks and migrations.

## Considered Options

- **Portable JSON export**: Human-readable and decoupled from SQLite schema, but requires maintaining a separate serialization/versioning layer and degrades in size and speed on large vaults.
- **Dual format (SQLite + JSON)**: Doubles maintenance, validation, and testing surface for marginal user benefit.

## Consequences

- Vault Backups are directly compatible with automatic Safety Snapshots (`.bak`) and standard SQLite tools.
- Import must enforce SQLite integrity checks (`PRAGMA quick_check`), table verification, and `PRAGMA user_version` compatibility before applying changes.
