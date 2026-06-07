require("dotenv").config();

const path = require("path");
const multer = require("multer");
const express = require("express");
const { uploadTicketFile } = require("../services/GoogleDrive");

const app = express();

const upload = multer({
    dest: path.join(__dirname, "../uploads")
});

app.post("/test-drive", upload.single("archivo"), async (req, res) => {
    try {
        const archivoDrive = await uploadTicketFile(req.file);

        return res.json({
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
    }
});

app.listen(4000, () => {
    console.log("Servidor de prueba en http://localhost:4000");
});