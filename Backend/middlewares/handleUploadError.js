const multer = require("multer");

function handleUploadError(error, req, res, next) {
    if (!error) {
        return next();
    }

    console.error("Error procesando adjunto:", error);

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "Uno de los archivos supera el tamaño máximo de 50 MB."
            });
        }

        if (error.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "La carpeta no puede contener más de 100 archivos."
            });
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "El campo del adjunto no es válido."
            });
        }

        return res.status(400).json({
            ok: false,
            mensaje:
                "No fue posible procesar el adjunto.",
            error: error.message
        });
    }

    if (
        error.message?.includes(
            "no está permitido"
        )
    ) {
        return res.status(400).json({
            ok: false,
            mensaje: error.message
        });
    }

    return next(error);
}

module.exports = handleUploadError;