const fs = require("fs");
const { google } = require("googleapis");

const {
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    GOOGLE_DRIVE_FOLDER_ID
} = process.env;

if (!FIREBASE_CLIENT_EMAIL) {
    throw new Error("Falta FIREBASE_CLIENT_EMAIL en el .env");
}

if (!FIREBASE_PRIVATE_KEY) {
    throw new Error("Falta FIREBASE_PRIVATE_KEY en el .env");
}

if (!GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error("Falta GOOGLE_DRIVE_FOLDER_ID en el .env");
}

const auth = new google.auth.JWT({
    email: FIREBASE_CLIENT_EMAIL,
    key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.file"]
});

const drive = google.drive({
    version: "v3",
    auth
});

async function uploadTicketFile(archivo) {
    if (!archivo) {
        return null;
    }

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
    uploadTicketFile
};