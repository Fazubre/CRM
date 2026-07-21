const express = require("express");

const {
    generateDriveAuthUrl,
    getTokensFromCode
} = require(
    "../services/GoogleDrive/GoogleDriveOAuth"
);

const router = express.Router();

router.get("/connect", (req, res) => {
    try {
        const urlAutorizacion = generateDriveAuthUrl();

        return res.redirect(urlAutorizacion);
    } catch (error) {
        console.error("Error iniciando OAuth de Drive:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible iniciar la conexión con Google Drive",
            error: error.message
        });
    }
});

router.get("/callback", async (req, res) => {
    try {
        const { code, error: errorGoogle } = req.query;

        if (errorGoogle) {
            return res.status(400).json({
                ok: false,
                mensaje: "Google rechazó la autorización",
                error: errorGoogle
            });
        }

        if (!code) {
            return res.status(400).json({
                ok: false,
                mensaje: "Google no devolvió el código de autorización"
            });
        }

        const tokens = await getTokensFromCode(code);

        console.log("Tokens obtenidos:", tokens);

        return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Google Drive conectado</title>
            </head>
            <body>
                <h1>Google Drive conectado correctamente</h1>

                <p>Copie el siguiente refresh token y guárdelo temporalmente en el archivo .env:</p>

                <textarea
                    style="width: 90%; height: 180px;"
                    readonly
                >${tokens.refresh_token || "Google no devolvió un refresh token"}</textarea>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("Error procesando callback de Drive:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible completar la conexión con Google Drive",
            error: error.message
        });
    }
});

module.exports = router;