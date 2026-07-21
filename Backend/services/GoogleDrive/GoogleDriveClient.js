const { google } = require("googleapis");

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_DRIVE_REDIRECT_URI,
    GOOGLE_DRIVE_FOLDER_ID
} = process.env;

function validateGoogleDriveEnvironment() {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error(
            "Falta GOOGLE_CLIENT_ID en el .env"
        );
    }

    if (!GOOGLE_CLIENT_SECRET) {
        throw new Error(
            "Falta GOOGLE_CLIENT_SECRET en el .env"
        );
    }

    if (!GOOGLE_DRIVE_REDIRECT_URI) {
        throw new Error(
            "Falta GOOGLE_DRIVE_REDIRECT_URI en el .env"
        );
    }

    if (!GOOGLE_DRIVE_FOLDER_ID) {
        throw new Error(
            "Falta GOOGLE_DRIVE_FOLDER_ID en el .env"
        );
    }
}

validateGoogleDriveEnvironment();

function createOAuthClient() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_DRIVE_REDIRECT_URI
    );
}

function createDriveClient(
    refreshToken
) {
    if (!refreshToken) {
        throw new Error(
            "No existe refresh_token para utilizar Google Drive."
        );
    }

    const oauth2Client =
        createOAuthClient();

    oauth2Client.setCredentials({
        refresh_token:
            refreshToken
    });

    return google.drive({
        version: "v3",
        auth: oauth2Client
    });
}

function generateDriveAuthUrl() {
    const oauth2Client =
        createOAuthClient();

    return oauth2Client.generateAuthUrl({
        access_type:
            "offline",

        prompt:
            "consent",

        scope: [
            "https://www.googleapis.com/auth/drive.file"
        ]
    });
}

async function getTokensFromCode(
    code
) {
    if (!code) {
        throw new Error(
            "No se recibió el código de autorización de Google."
        );
    }

    const oauth2Client =
        createOAuthClient();

    const {
        tokens
    } = await oauth2Client.getToken(
        code
    );

    return tokens;
}

module.exports = {
    GOOGLE_DRIVE_FOLDER_ID,
    createOAuthClient,
    createDriveClient,
    generateDriveAuthUrl,
    getTokensFromCode
};