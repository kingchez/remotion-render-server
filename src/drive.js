const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

function getAuth() {
  // GOOGLE_SERVICE_ACCOUNT_JSON holds the *entire* service account JSON key
  // as a single-line string, set as an env var in Dokploy (never committed to git).
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var is not set");
  }
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

async function driveClient() {
  const auth = getAuth();
  return google.drive({ version: "v3", auth });
}

// Downloads a Drive file by its fileId into destPath on local disk
async function downloadFile(fileId, destPath) {
  const drive = await driveClient();
  const dest = fs.createWriteStream(destPath);

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    res.data
      .on("end", () => resolve(destPath))
      .on("error", reject)
      .pipe(dest);
  });
}

// Uploads a local file to a specific Drive folder, returns the new file's id + link
async function uploadFile(localPath, folderId, mimeType) {
  const drive = await driveClient();
  const fileName = path.basename(localPath);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType,
      body: fs.createReadStream(localPath),
    },
    fields: "id, webViewLink, webContentLink",
  });

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink,
    webContentLink: res.data.webContentLink,
  };
}

module.exports = { downloadFile, uploadFile };
