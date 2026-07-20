---
type: Concept
title: Range-Resume Staging Downloader
description: Partial-offset resumable downloads with checksum verification and atomic renames.
tags: [updates, download]
timestamp: 2026-07-05
---

# Range-Resume Staged Downloader

Downloading installer binaries over home internet requires network fault tolerance. The Staging Downloader is engineered to support interrupted downloads and file integrity checking.

## Load-Bearing Mechanics

### 1. HTTP Range-Requests & Staging File
Downloads are staged as temporary files (with `.part` suffixes) under the app's local updates folder.
- **Interrupted Resume:** If a download is cancelled or loses connection, the downloader queries the existing file size on disk (`partPath`).
- It requests the remaining data from the remote server by injecting the HTTP `Range: bytes=offset-` header.
- **Server Support Fallback:** If the remote server responds with HTTP 200 instead of HTTP 206 (Partial Content), the downloader deletes the partial file and restarts the download from 0.

### 2. Size Integrity Validation
Once the download stream closes, the client checks the size of the final file against the remote asset size. Mismatches trigger automatic deletion of the partial file, resetting the staging cache to prevent corrupt installer execution.

### 3. Atomic Renaming
Once size and integrity are fully validated, the `.part` extension is removed. The installer is moved to the target download directory using Node's atomic renaming. This ensures the app never triggers execution on a half-written file.
