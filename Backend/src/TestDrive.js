require("dotenv").config();

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const express = require("express");

const {
    uploadTicketFileWithOAuth
} = require("../services/GoogleDriveOAuth");

const app = express();

const upload = multer({
    dest: path.join(__dirname, "../uploads"),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

app.post("/test-drive", upload.single("archivo"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                ok: false,
                mensaje: "No se recibió ningún archivo"
            });
        }

        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        if (!refreshToken) {
            return res.status(500).json({
                ok: false,
                mensaje: "Falta GOOGLE_DRIVE_REFRESH_TOKEN en el archivo .env"
            });
        }

        console.log("Subiendo archivo mediante OAuth 2.0");

        const archivoDrive = await uploadTicketFileWithOAuth(
            req.file,
            refreshToken
        );

        return res.status(201).json({
            ok: true,
            mensaje: "Archivo subido correctamente a Google Drive",
            archivo: archivoDrive
        });
    } catch (error) {
        console.error("Error subiendo archivo a Drive:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible subir el archivo a Google Drive",
            error: error.message
        });
    } finally {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

app.listen(4000, () => {
    console.log("Servidor de prueba en http://localhost:4000");
});