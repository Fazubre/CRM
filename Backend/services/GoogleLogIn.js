const express = require("express");
const { OAuth2Client } = require("google-auth-library");

const router = express.Router();

const clienteGoogle = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                ok: false,
                mensaje: "No se recibió el token de Google"
            });
        }

        const ticket = await clienteGoogle.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(401).json({
                ok: false,
                mensaje: "No fue posible obtener los datos del usuario"
            });
        }

        const usuarioGoogle = {
            google_id: payload.sub,
            nombre: payload.name || "",
            correo: payload.email || "",
            foto_url: payload.picture || "",
            correo_verificado: payload.email_verified || false
        };

        return res.status(200).json({
            ok: true,
            mensaje: "Login con Google exitoso",
            usuario: usuarioGoogle
        });
    } catch (error) {
        console.error("Error en login con Google:", error.message);

        return res.status(401).json({
            ok: false,
            mensaje: "Token inválido, expirado o no autorizado"
        });
    }
});

module.exports = router;