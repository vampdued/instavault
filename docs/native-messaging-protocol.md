# InstaVault Native Messaging Protocol

Protocol version: `instavault/1`

The extension service worker opens one long-lived connection to
`com.instavault.downloader`. Content scripts never connect to the native host
directly.

The browser-launched native host is a thin stdio bridge. It forwards the same
length-prefixed byte stream to the persistent per-user agent over a Windows
named pipe or Unix-domain socket. If the agent is not running, the bridge starts
it and retries the connection. SQLite, queue state, and events are owned only by
the agent, so closing the browser port does not stop active jobs.

Every request has a unique correlation ID:

```json
{
  "protocol": "instavault/1",
  "id": "request-123",
  "kind": "request",
  "type": "download.create",
  "payload": {}
}
```

Responses repeat the request ID and use `ok` to distinguish success from a
structured error. Events have `kind: "event"` and a monotonically increasing
`sequence` for the lifetime of the host connection.

## Implemented commands

- `session.hello`
- `app.version`
- `health.get`
- `download.create`
- `download.batch.create` (1–500 media items)
- `download.cancel`
- `queue.get`
- `queue.pause`
- `queue.resume`
- `activity.get`
- `settings.get`
- `settings.update`
- `history.list`

Implemented events include `download.queued`, `download.started`,
`download.progress`, `download.completed`, `download.skipped`,
`download.failed`, `download.canceled`, and `log.update`.

## Framing and limits

Messages are UTF-8 JSON prefixed with a four-byte little-endian unsigned
length. The host accepts messages up to 8 MiB and never emits a message larger
than 1 MiB. Media bytes are downloaded by the Go application and must never be
placed in protocol messages.

Standard output is reserved for framed protocol messages. Diagnostics must be
written to standard error.

## Development transport flag

The extension reads `instavaultTransport` from `chrome.storage.local`:

- `native` (default): native messaging only.
- `http`: legacy localhost API only.
- `auto`: try native messaging, then use HTTP only if the native host does not
  acknowledge the request.

The HTTP modes are transitional and will be removed from production after
native transport parity is verified.
