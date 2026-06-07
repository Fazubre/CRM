const fs = require("fs");
const { google } = require("googleapis");

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_DRIVE_REDIRECT_URI,
    GOOGLE_DRIVE_FOLDER_ID
} = process.env;

if (!GOOGLE_CLIENT_ID) {
    throw new Error("Falta GOOGLE_CLIENT_ID en el .env");
}

if (!GOOGLE_CLIENT_SECRET) {
    throw new Error("Falta GOOGLE_CLIENT_SECRET en el .env");
}

if (!GOOGLE_DRIVE_REDIRECT_URI) {
    throw new Error("Falta GOOGLE_DRIVE_REDIRECT_URI en el .env");
}

if (!GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error("Falta GOOGLE_DRIVE_FOLDER_ID en el .env");
}

function createOAuthClient() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_DRIVE_REDIRECT_URI
    );
}

function generateDriveAuthUrl() {
    const oauth2Client = createOAuthClient();

    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/drive.file"
        ]
    });
}

async function getTokensFromCode(code) {
    const oauth2Client = createOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    return tokens;
}

async function uploadTicketFileWithOAuth(archivo, refreshToken) {
    if (!archivo) {
        return null;
    }

    if (!refreshToken) {
        throw new Error("No existe refresh_token para subir archivos a Google Drive");
    }

    const oauth2Client = createOAuthClient();

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    const drive = google.drive({
        version: "v3",
        auth: oauth2Client
    });

    const nombreArchivo = `${Date.now()}-${archivo.originalname}`;

    const metadataArchivo = {
        name: nombreArchivo,
        parents: [GOOGLE_DRIVE_FOLDER_ID]
    };

    const media = {
        mimeType: archivo.mimetype,
        body: fs.createReadStream(archivo.path)
    };

    const respuesta = await drive.files.create({
        requestBody: metadataArchivo,
        media,
        fields: "id, name, webViewLink, webContentLink"
    });

    await drive.permissions.create({
        fileId: respuesta.data.id,
        requestBody: {
            role: "reader",
            type: "anyone"
        }
    });

    return {
        id: respuesta.data.id,
        nombre: respuesta.data.name,
        webViewLink: respuesta.data.webViewLink,
        webContentLink: respuesta.data.webContentLink
    };
}

module.exports = {
    generateDriveAuthUrl,
    getTokensFromCode,
    uploadTicketFileWithOAuth
};