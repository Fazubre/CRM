const multer = require("multer");

function handleUploadError(error, req, res, next) {
    if (!error) {
        return next();
    }

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                ok: false,
                mensaje: "El archivo no puede superar los 10 MB."
            });
        }

        if (error.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                ok: false,
                mensaje: "Solo se permite un archivo por ticket."
            });
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
                ok: false,
                mensaje: "El campo del archivo debe llamarse archivo."
            });
        }

        return res.status(400).json({
            ok: false,
            mensaje: "No fue posible procesar el archivo.",
            error: error.message
        });
    }

    if (error.message === "El formato del archivo no está permitido.") {
        return res.status(400).json({
            ok: false,
            mensaje: error.message
        });
    }

    return next(error);
}

module.exports = handleUploadError;