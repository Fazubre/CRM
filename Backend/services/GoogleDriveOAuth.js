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
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/gmail.send"

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

    console.log("GOOGLE DRIVE UPLOAD VERSION: 2026-06-07-DEBUG-V1");

    console.log("Datos del archivo antes de subir:", {
        originalname: archivo.originalname,
        mimetype: archivo.mimetype,
        size: archivo.size,
        path: archivo.path
    });

    console.log("Folder ID usado:", GOOGLE_DRIVE_FOLDER_ID);

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

    try {
        const respuesta = await drive.files.create({
            requestBody: metadataArchivo,
            media,
            fields: "id, name, webViewLink, webContentLink",
            supportsAllDrives: true
        });

        console.log("Archivo creado en Drive:", respuesta.data);

        await drive.permissions.create({
            fileId: respuesta.data.id,
            requestBody: {
                role: "reader",
                type: "anyone"
            },
            supportsAllDrives: true
        });

        console.log("Permiso público agregado al archivo:", respuesta.data.id);

        return {
            id: respuesta.data.id,
            nombre: respuesta.data.name,
            webViewLink: respuesta.data.webViewLink,
            webContentLink: respuesta.data.webContentLink
        };
    } catch (error) {
        console.error("Error real subiendo archivo a Drive:", error.message);

        if (error.response?.data) {
            console.error("Detalle de Google Drive:", JSON.stringify(error.response.data, null, 2));
        }

        throw error;
    }
}
function createDriveClient(refreshToken) {
    if (!refreshToken) {
        throw new Error(
            "No existe refresh_token para utilizar Google Drive."
        );
    }

    const oauth2Client = createOAuthClient();

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return google.drive({
        version: "v3",
        auth: oauth2Client
    });
}

async function createDriveFolder(drive, nombre, parentId) {
    const response = await drive.files.create({
        requestBody: {
            name: nombre,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId]
        },
        fields: "id, name, webViewLink",
        supportsAllDrives: true
    });

    return response.data;
}

async function uploadFileToDriveFolder(
    drive,
    archivo,
    parentId,
    nombreArchivo
) {
    const response = await drive.files.create({
        requestBody: {
            name: nombreArchivo,
            parents: [parentId]
        },
        media: {
            mimeType: archivo.mimetype,
            body: fs.createReadStream(archivo.path)
        },
        fields: "id, name, webViewLink, webContentLink",
        supportsAllDrives: true
    });

    return response.data;
}

function normalizeRelativePath(ruta) {
    return String(ruta || "")
        .replaceAll("\\", "/")
        .split("/")
        .filter(Boolean);
}

async function uploadTicketFolderWithOAuth(
    archivos,
    rutasRelativas,
    refreshToken
) {
    if (!Array.isArray(archivos) || archivos.length === 0) {
        return null;
    }

    if (
        !Array.isArray(rutasRelativas) ||
        rutasRelativas.length !== archivos.length
    ) {
        throw new Error(
            "Las rutas de la carpeta no coinciden con los archivos recibidos."
        );
    }

    const drive = createDriveClient(refreshToken);

    const primeraRuta = normalizeRelativePath(
        rutasRelativas[0]
    );

    const nombreCarpetaOriginal =
        primeraRuta.length > 1
            ? primeraRuta[0]
            : "Carpeta";

    const nombreCarpetaDrive =
        `${Date.now()}-${nombreCarpetaOriginal}`;

    const carpetaRaiz = await createDriveFolder(
        drive,
        nombreCarpetaDrive,
        GOOGLE_DRIVE_FOLDER_ID
    );

    const carpetasCreadas = new Map();

    carpetasCreadas.set("", carpetaRaiz.id);

    for (let indice = 0; indice < archivos.length; indice += 1) {
        const archivo = archivos[indice];

        const partesRuta = normalizeRelativePath(
            rutasRelativas[indice]
        );

        const nombreArchivo =
            partesRuta.pop() || archivo.originalname;

        let directorios = partesRuta;

        if (
            directorios.length > 0 &&
            directorios[0] === nombreCarpetaOriginal
        ) {
            directorios = directorios.slice(1);
        }

        let parentId = carpetaRaiz.id;
        let rutaAcumulada = "";

        for (const nombreDirectorio of directorios) {
            rutaAcumulada = rutaAcumulada
                ? `${rutaAcumulada}/${nombreDirectorio}`
                : nombreDirectorio;

            if (!carpetasCreadas.has(rutaAcumulada)) {
                const carpetaCreada = await createDriveFolder(
                    drive,
                    nombreDirectorio,
                    parentId
                );

                carpetasCreadas.set(
                    rutaAcumulada,
                    carpetaCreada.id
                );
            }

            parentId = carpetasCreadas.get(rutaAcumulada);
        }

        await uploadFileToDriveFolder(
            drive,
            archivo,
            parentId,
            nombreArchivo
        );
    }

    await drive.permissions.create({
        fileId: carpetaRaiz.id,
        requestBody: {
            role: "reader",
            type: "anyone"
        },
        supportsAllDrives: true
    });

    return {
        id: carpetaRaiz.id,
        nombre: carpetaRaiz.name,
        webViewLink: carpetaRaiz.webViewLink,
        cantidadArchivos: archivos.length
    };
}
module.exports = {
    generateDriveAuthUrl,
    getTokensFromCode,
    uploadTicketFileWithOAuth,
    uploadTicketFolderWithOAuth
};