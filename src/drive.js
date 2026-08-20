const fs = require("fs");
const { Readable } = require("stream");
const { finished } = require("stream/promises");

// This service holds NO Google credentials of any kind — same as
// chatterbox-tts and whisperx, neither of which talk to Google Drive
// directly either. All Drive I/O for those two happens on the n8n side,
// via n8n's own credentialed Google Drive node, after pulling the
// finished job's raw output from each service's own GET/ack endpoints.
//
// This file previously used a google.auth.OAuth2 client (client id +
// secret + refresh token, all from env vars) to download input assets
// (mainly per-scene voiceover audio). That's what threw `invalid_grant`
// — an expired/revoked refresh token — and it was never actually
// required: every file this server is ever asked to download by fileId
// (voiceover audio from Chatterbox, any media_assets image/video) is
// already shared "anyone with the link can view" by the stage that
// uploaded it (see pipeline-operating-manual.md §2 Stage 3 — Chatterbox's
// callback shares each segment "anyone/reader" immediately after
// upload). A publicly-shared file needs no auth to download — just a
// plain HTTPS GET against Drive's public export endpoint. Removing the
// OAuth client here also drops the ~207MB `googleapis` dependency
// entirely (previously flagged as a known, not-yet-done optimization in
// style-library.md's Known Gaps section — this closes it for free as a
// side effect of the actual bug fix, not a separate project).

const DRIVE_DOWNLOAD_BASE = "https://drive.google.com/uc?export=download";

function driveDownloadUrl(fileId) {
  return `${DRIVE_DOWNLOAD_BASE}&id=${encodeURIComponent(fileId)}`;
}

// For files above a certain size, Drive's public endpoint serves an HTML
// "can't scan this file for viruses" interstitial instead of the raw
// bytes, embedding a one-time confirm token you have to replay. Detect
// that case explicitly rather than silently writing an HTML page to disk
// as if it were the real audio/video file.
function extractConfirmToken(html) {
  const match = html.match(/confirm=([0-9A-Za-z_-]+)/);
  return match ? match[1] : null;
}

async function fetchDriveFile(fileId) {
  let res = await fetch(driveDownloadUrl(fileId));
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    const html = await res.text();
    const token = extractConfirmToken(html);
    if (!token) {
      throw new Error(
        `Drive file ${fileId} returned an HTML page instead of file bytes, and no ` +
          `confirm token was found in it. Most likely cause: the file isn't actually ` +
          `shared "Anyone with the link" (still restricted), or the fileId is wrong.`
      );
    }
    res = await fetch(
      `${DRIVE_DOWNLOAD_BASE}&id=${encodeURIComponent(fileId)}&confirm=${token}`
    );
  }

  if (!res.ok) {
    throw new Error(`Drive download for ${fileId} failed: HTTP ${res.status}`);
  }

  return res;
}

// Downloads a Drive file by its fileId into destPath on local disk.
async function downloadFile(fileId, destPath) {
  const res = await fetchDriveFile(fileId);
  const dest = fs.createWriteStream(destPath);
  await finished(Readable.fromWeb(res.body).pipe(dest));
  return destPath;
}

// Fetches just the real Content-Type for a Drive file, without keeping
// the downloaded body around — so callers (index.js's resolveAssets) can
// pick a correct local file extension instead of guessing one from the
// prop name. `name` is no longer available without the authenticated
// Drive API and isn't currently used by any caller — kept as null for
// backward-compatible shape.
async function getFileMetadata(fileId) {
  const res = await fetchDriveFile(fileId);
  if (res.body) {
    await res.body.cancel();
  }
  return { mimeType: res.headers.get("content-type") || null, name: null };
}

module.exports = { downloadFile, getFileMetadata };
