const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN env vars are all required"
    );
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

async function driveClient() {
  const auth = getOAuthClient();
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
