# Usage guide

[Back to README](../README.md) · [简体中文](usage.zh-CN.md)

## Choose a context

| | Temporary Context | Account Context / Thread |
| --- | --- | --- |
| Access | Passphrase; no sign-in or API key | Google browser session or personal API key |
| Lifetime | Expires after 7 days without access | No automatic expiry |
| Web | Read, append, edit, and clear content | List, create, and read documents |
| Agent access | REST | REST and MCP |
| Editing | Web and REST; version checked | REST and MCP; version checked |
| History | Current content and version only | Creation and edits store immutable Revisions; browsing/restoration unavailable |

Account documents belong to their owner. Knowing a Context ID does not grant
access. Temporary Contexts are separate from account documents and have no Threads.

## Quick start in the Web app

Open the app's home page `/` (legacy `/clipboard` also works) and choose **For Humans**.
Enter a passphrase of 8–128 characters or choose **Generate random passphrase**.
The first use creates a Temporary Context; the same passphrase opens it again.

- **Copy passphrase** copies only the access passphrase.
- **Copy Prompt** copies instructions with the passphrase and REST commands for an
  agent to read and append content. **For Agents** also offers a prompt to get started.
- **Add content** appends text; **Edit content** replaces the existing text, with
  **Save changes** and **Cancel editing**. Saving an empty document clears it.

Anyone with the passphrase can read and modify the content. Prefer a generated
passphrase and keep it safe: leaving the Context requires entering it again, and
passphrases are not put in URLs. Content expires after 7 days without access. Successful opens, reads, appends,
and edits renew the deadline to 7 days from that access, including webpage polling.
Reading only renews the deadline; it does not change the content version or edit timestamp.
Expired records are deleted at server startup and every 24 hours while the server runs,
and when a Context is opened. If the server is asleep or offline, deletion resumes
when it starts; expired content remains inaccessible. Opening an expired passphrase creates a
new, empty Context; reading or modifying an expired Context returns `404`.

## Current limits

Account Context/Thread editing is available through REST/MCP; their Web pages
currently provide creation and reading. Deletion, archiving, custom ordering,
Revision browsing, and restoration are not exposed. Temporary Contexts do not
save Revision history or offer account ownership. Product design and planned
work are in [note.md](../note.md); planned features there are not all implemented.

Related: [Agent access](agent-access.md) · [Local development](development.md) · [Deployment](deployment.md)
