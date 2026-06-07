const express = require("express");
const {
    generateDriveAuthUrl,
    getTokensFromCode
} = require("../services/GoogleDriveOAuth");

const router = express.Router();

router.get("/connect", (req, res) => {
    try {
        const url = generateDriveAuthUrl();
        return res.redirect(url);
    } catch (error) {
        console.error("Error generando URL de Google Drive:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible iniciar la conexión con Google Drive",
            error: error.message
        });
    }
});

router.get("/callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                ok: false,
                mensaje: "No se recibió el código de autorización de Google"
            });
        }

        const tokens = await getTokensFromCode(code);

        console.log("Tokens de Google Drive:", tokens);

        return res.status(200).send(`
            <h2>Google Drive conectado correctamente</h2>
            <p>Copiá este refresh_token temporalmente para la prueba:</p>
            <textarea style="width: 100%; height: 160px;">${tokens.refresh_token || "No se recibió refresh_token"}</textarea>
        `);
    } catch (error) {
        console.error("Error en callback de Google Drive:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible completar la conexión con Google Drive",
            error: error.message
        });
    }
});

module.exports = router;