---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# Sniff uploads, store them under random keys

## Context and Problem Statement

A manuscript's extension and the browser's MIME claim are both chosen by the uploader. Storing files under the names people send invites path traversal and overwrites.

## Decision Drivers

- A disguised binary is refused, whatever it is called.
- No user input becomes part of a path.
- A refused change leaves no file behind.

## Considered Options

- Sniff the content, store under random UUID keys, keep the cleaned name as data
- Trust the extension and MIME type
- Store the bytes in the database

## Decision Outcome

Chosen option: sniffing and random keys. A file is a PDF if it starts with `%PDF-`, or plain text if the whole file decodes as UTF-8 with no NUL bytes; nothing else is accepted. Files are capped at 5 MB before they are read. Each is written under a new UUID with an exclusive-create flag; the cleaned original name is stored only as data. If the database refuses the change the new file is deleted; after a commit the replaced file is deleted, and a failure there is logged rather than reported to the author. Downloads re-check visibility and send `attachment`, `nosniff` and a sandboxing CSP.

### Consequences

- Good, because a real PDF is accepted whatever its name, and a binary named `.pdf` is not.
- Bad, because `.docx` and `.odt` are refused; the submission guidelines ask for PDF or plain text.
- Bad, because a crash between the commit and the delete leaves a stray file, which no record refers to.

### Confirmation

Unit tests under "uploads" in `shared/tests/rules.test.ts`; API tests "judges files by their bytes and size, and cleans the name", "rejects an upload against a stale version without keeping the file" and "still reports a committed replacement as saved when the old file cannot be deleted"; end-to-end test "a disguised binary is rejected however it is named".

## Pros and Cons of the Options

- **Sniffing and random keys:** names and claims are never trusted; only two formats are recognised.
- **Trusting the extension:** any format works, and so does any disguise.
- **Bytes in the database:** one transaction covers file and record, at the cost of a bloated database and backups.

## More Information

OWASP File Upload Cheat Sheet. [Upload pipeline](../explanation/architecture.md#upload-pipeline).
