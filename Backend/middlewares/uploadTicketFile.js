const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, {
        recursive: true
    });
}

const tiposPermitidos = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "text/plain"
];

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadsPath);
    },

    filename: (req, file, callback) => {
        const nombreSeguro = file.originalname
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        const nombreTemporal = `${Date.now()}-${nombreSeguro}`;

        callback(null, nombreTemporal);
    }
});

const fileFilter = (req, file, callback) => {
    if (!tiposPermitidos.includes(file.mimetype)) {
        return callback(
            new Error("El formato del archivo no está permitido."),
            false
        );
    }

    return callback(null, true);
};

const uploadTicketFile = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});

module.exports = uploadTicketFile;