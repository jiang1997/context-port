# Agent access

[Back to README](../README.md) · [简体中文](agent-access.zh-CN.md)

## Temporary Context REST

These JSON endpoints require a passphrase, except generation; they do not require
Google login or an API key. The API base is `/api/v1`. Legacy `/api/v1/clipboard/*`
paths remain supported. Temporary Contexts are not exposed as MCP tools.

Temporary Context endpoints, including legacy paths, allow cross-origin requests
from any origin without login cookies. Passphrase access and the limit of 60
requests per IP per minute still apply; other endpoints retain their origin allowlist.

| Method | Path | JSON body | Result |
| --- | --- | --- | --- |
| POST | `/temporary-contexts/generate` | None | Generate a passphrase and create a Context |
| POST | `/temporary-contexts/open` | `{"passphrase":"..."}` | Create or reopen |
| POST | `/temporary-contexts/read` | `{"passphrase":"..."}` | Read existing content |
| POST | `/temporary-contexts/append` | `{"passphrase":"...","content":"..."}` | Append text |
| POST | `/temporary-contexts/update` | `{"passphrase":"...","content":"...","expectedVersion":2}` | Replace all content, including clearing it |

Example against the local API (replace the host with your deployed API host):

```bash
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/generate'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/open' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase"}'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/append' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase","content":"Task background"}'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/read' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase"}'
```

Generation returns `passphrase` along with the Context. Other operations return
`content`, `version`, `createdAt`, `updatedAt`, and `expiresAt`; open also returns
`created`. A new Context starts at version 1. Each append or update increments it.

Read before editing and supply that response's version as `expectedVersion`.
For example, if read returns version 2:

```bash
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/update' \
  -H 'Content-Type: application/json' \
  -d '{"passphrase":"example-passphrase","content":"Revised task background","expectedVersion":2}'
```

A stale version returns `409 VERSION_CONFLICT`: read again, merge your changes,
then retry with the latest version. Do not just change the version and overwrite
someone else's additions. Append accepts 1–20,000 characters; total content and
replacement content are limited to 100,000 characters. The server stores a keyed
passphrase digest and the shared content; hashing the passphrase does not encrypt
the content.

## Account Context / Thread REST

Sign in with Google and create a personal key on **API Keys** (`/keys`). Agents send
`Authorization: Bearer <api-key>`. Keys can read and write their owner's documents;
share them with trusted agents and revoke them when no longer needed. Browser
session writes also require the CSRF header handled by the Web app.

All paths below are relative to `/api/v1`:

| Method | Path | Result |
| --- | --- | --- |
| GET | `/contexts?limit=50&offset=0` | Context summaries without bodies |
| POST | `/contexts` | Create a Context |
| GET | `/contexts/:contextId` | Context body and Thread index |
| PATCH | `/contexts/:contextId` | Update a Context |
| POST | `/contexts/:contextId/threads` | Create a Thread |
| GET | `/contexts/:contextId/threads/:threadId` | Read a Thread |
| PATCH | `/contexts/:contextId/threads/:threadId` | Update a Thread |

```bash
curl -fsS -H 'Authorization: Bearer <api-key>' \
  'http://127.0.0.1:3000/api/v1/contexts?limit=50&offset=0'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/contexts' \
  -H 'Authorization: Bearer <api-key>' -H 'Content-Type: application/json' \
  -d '{"title":"Project background","content":"# Goals\nShared instructions","createdByType":"agent","createdBy":"My agent"}'
curl -fsS -X PATCH 'http://127.0.0.1:3000/api/v1/contexts/<context-id>' \
  -H 'Authorization: Bearer <api-key>' -H 'Content-Type: application/json' \
  -d '{"content":"Updated instructions","updatedByType":"agent","updatedBy":"My agent","expectedVersion":1}'
```

Context and Thread creation share the same body: required `title` (1–300
characters) and `createdByType` (`human` or `agent`), optional `content` (up to
100,000 characters) and `createdBy`. Updates require `expectedVersion`,
`updatedByType`, and at least one of `title` or `content`; `updatedBy` is optional.
Use the version returned by the preceding read, rather than a fixed value from an
example. Stale updates return `409 VERSION_CONFLICT`; read, merge, and retry.
Creation and each successful edit atomically save an immutable Revision.

Context detail includes Thread summaries without their bodies; read each Thread
separately. Actor names are caller-supplied labels, not permission identities.
Creation has no idempotency key: after a timeout, check the list before retrying.

## Account MCP

The server exposes stateless Streamable HTTP MCP at `http://127.0.0.1:3000/mcp`.
Configure an HTTP MCP client with that URL and the same Bearer API key header.
For a deployed server, use its API host's `/mcp` endpoint; the Vercel Web rewrite
only forwards `/api/*`, not `/mcp`.

Tools: `list_contexts`, `get_context`, `create_context`, `update_context`,
`create_thread`, `get_thread`, and `update_thread`.

Create and update inputs follow the REST contracts above. Context reads/updates
require `contextId`; Thread creation requires `contextId`, and Thread reads/updates
require both `contextId` and `threadId`. Tool failures return `isError: true` with
an error payload; version conflicts use `VERSION_CONFLICT`.

Related: [Usage guide](usage.md) · [Local development](development.md)
