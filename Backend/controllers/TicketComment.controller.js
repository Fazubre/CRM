const fs = require(
    "fs/promises"
);

const {
    createTicketComment,
    getTicketComments,
    getTicketCommentById,
    updateTicketComment,
    updateTicketCommentDriveData,
    deleteTicketComment
} = require(
    "../models/TicketComment.model"
);

const {
    getTicketById,
    updateTicketDriveData
} = require(
    "../models/Ticket.model"
);

const {
    getEmployeeById
} = require(
    "../models/Employee.model"
);

const {
    getEmployeeRole
} = require(
    "../middlewares/auth.middleware"
);

const {
    ensureTicketDriveStorage
} = require(
    "../services/GoogleDrive/TicketDrive"
);

const {
    prepareCommentAttachmentReplacement,
    deleteCommentAttachment,
    deleteCommentDriveStorage,
    rollbackCommentAttachmentReplacement,
    finalizeCommentAttachmentReplacement
} = require(
    "../services/GoogleDrive/TicketCommentDrive"
);

/*
    Obtiene todos los archivos temporales
    recibidos por Multer.
*/
function getUploadedFiles(
    req
) {
    if (
        !req.files ||
        typeof req.files !==
        "object"
    ) {
        return [];
    }

    const individualFiles =
        Array.isArray(
            req.files.archivo
        )
            ? req.files.archivo
            : [];

    const folderFiles =
        Array.isArray(
            req.files
                .carpetaArchivos
        )
            ? req.files
                .carpetaArchivos
            : [];

    return [
        ...individualFiles,
        ...folderFiles
    ];
}

/*
    Elimina los archivos temporales
    creados por Multer.
*/
async function deleteTemporaryFiles(
    req
) {
    const files =
        getUploadedFiles(
            req
        );

    await Promise.all(
        files.map(
            async (
                file
            ) => {
                if (!file?.path) {
                    return;
                }

                try {
                    await fs.unlink(
                        file.path
                    );

                    console.log(
                        "Archivo temporal de comentario eliminado:",
                        file.path
                    );
                } catch (error) {
                    console.warn(
                        "No fue posible eliminar el archivo temporal:",
                        file.path,
                        error.message
                    );
                }
            }
        )
    );
}

/*
    Interpreta las rutas relativas
    cuando el usuario selecciona una carpeta.
*/
function parseFolderPaths(
    req,
    folderFiles
) {
    if (
        !Array.isArray(
            folderFiles
        ) ||
        folderFiles.length ===
        0
    ) {
        return [];
    }

    const pathsText =
        req.body
            ?.rutasCarpeta ||
        "[]";

    let relativePaths;

    try {
        relativePaths =
            JSON.parse(
                pathsText
            );
    } catch (error) {
        throw createHttpError(
            "No fue posible interpretar la estructura de la carpeta.",
            400
        );
    }

    if (
        !Array.isArray(
            relativePaths
        )
    ) {
        throw createHttpError(
            "La estructura de la carpeta no tiene un formato válido.",
            400
        );
    }

    if (
        relativePaths.length !==
        folderFiles.length
    ) {
        throw createHttpError(
            "La cantidad de rutas no coincide con la cantidad de archivos recibidos.",
            400
        );
    }

    return relativePaths;
}

/*
    Obtiene el archivo o carpeta
    seleccionada en el formulario.
*/
function getAttachmentSelection(
    req
) {
    const individualFile =
        req.files
            ?.archivo
            ?.[0] ||
        null;

    const folderFiles =
        Array.isArray(
            req.files
                ?.carpetaArchivos
        )
            ? req.files
                .carpetaArchivos
            : [];

    if (
        individualFile &&
        folderFiles.length > 0
    ) {
        throw createHttpError(
            "Seleccione un archivo individual o una carpeta, no ambos.",
            400
        );
    }

    return {
        individualFile,

        folderFiles,

        relativePaths:
            parseFolderPaths(
                req,
                folderFiles
            )
    };
}

/*
    Obtiene el empleado autenticado.
    No toma el nombre ni el rol desde req.body.
*/
function getAuthenticatedUser(
    req
) {
    const user =
        req.user;

    if (!user?.id) {
        throw createHttpError(
            "Debe iniciar sesión para gestionar comentarios.",
            401
        );
    }

    return {
        id:
            String(
                user.id
            ),

        nombre:
            user.nombre ||
            user.name ||
            user.correo ||
            user.email ||
            "Usuario",

        correo:
            user.correo ||
            user.email ||
            "",

        rol:
            getEmployeeRole(
                user
            )
    };
}

function createHttpError(
    message,
    status
) {
    const error =
        new Error(
            message
        );

    error.status =
        status;

    return error;
}

function normalizeId(
    value
) {
    return String(
        value ||
        ""
    ).trim();
}

function normalizeEmail(
    value
) {
    return String(
        value ||
        ""
    )
        .trim()
        .toLowerCase();
}

function isSameUser(
    firstId,
    secondId
) {
    return (
        normalizeId(
            firstId
        ) !== "" &&
        normalizeId(
            firstId
        ) ===
        normalizeId(
            secondId
        )
    );
}

function canEditComment(
    user,
    comment
) {
    if (
        user.rol ===
        "admin"
    ) {
        return true;
    }

    return isSameUser(
        user.id,
        comment.autorId
    );
}

function validateCommentPermission(
    user,
    comment
) {
    if (
        canEditComment(
            user,
            comment
        )
    ) {
        return;
    }

    throw createHttpError(
        "Solo el autor o un administrador pueden editar este comentario.",
        403
    );
}

function validateAdmin(
    user
) {
    if (
        user.rol ===
        "admin"
    ) {
        return;
    }

    throw createHttpError(
        "Solo los administradores pueden eliminar comentarios.",
        403
    );
}

/*
    Verifica que el ticket tenga las carpetas:

    Ticket
    ├── Adjunto-Ticket
    └── Comentarios
*/
async function ensureTicketCommentStorage(
    ticket
) {
    const storageResult =
        await ensureTicketDriveStorage(
            ticket
        );

    if (
        storageResult.created
    ) {
        await updateTicketDriveData(
            ticket.id,
            {
                googleDrive:
                    storageResult
                        .googleDrive,

                archivoAdjunto:
                    storageResult
                        .archivoAdjunto
            }
        );
    }

    const commentsFolderId =
        storageResult
            .googleDrive
            ?.commentsFolder
            ?.id ||
        "";

    if (!commentsFolderId) {
        throw createHttpError(
            "No fue posible obtener la carpeta de comentarios del ticket.",
            500
        );
    }

    return {
        googleDrive:
            storageResult
                .googleDrive,

        commentsFolderId
    };
}

/*
    Carga el servicio de correo únicamente
    cuando se intenta enviar una notificación.

    Esto evita que el servidor falle mientras
    agregamos sendTicketCommentEmail en el
    siguiente paso.
*/
function getCommentEmailFunction() {
    try {
        const googleMail =
            require(
                "../services/GoogleMail"
            );

        if (
            typeof googleMail
                .sendTicketCommentEmail !==
            "function"
        ) {
            return null;
        }

        return googleMail
            .sendTicketCommentEmail;
    } catch (error) {
        console.error(
            "No fue posible cargar GoogleMail:",
            error.message
        );

        return null;
    }
}

/*
    Envía correo al empleado asignado.

    No envía correo cuando:
    - El ticket no tiene empleado.
    - El autor es el empleado asignado.
    - El empleado no tiene correo.
    - Todavía no existe sendTicketCommentEmail.
*/
async function trySendCommentEmail({
    ticket,
    comment,
    author
}) {
    if (!ticket?.empleadoId) {
        return {
            enviado:
                false,

            motivo:
                "El ticket no tiene empleado asignado."
        };
    }

    if (
        isSameUser(
            ticket.empleadoId,
            author.id
        )
    ) {
        return {
            enviado:
                false,

            motivo:
                "El autor del comentario es el empleado asignado."
        };
    }

    try {
        const assignedEmployee =
            await getEmployeeById(
                ticket.empleadoId
            );

        if (!assignedEmployee) {
            return {
                enviado:
                    false,

                motivo:
                    "No se encontró el empleado asignado."
            };
        }

        const assignedEmail =
            assignedEmployee.correo ||
            assignedEmployee.email ||
            "";

        if (!assignedEmail) {
            return {
                enviado:
                    false,

                motivo:
                    "El empleado asignado no tiene correo registrado."
            };
        }

        if (
            normalizeEmail(
                assignedEmail
            ) ===
            normalizeEmail(
                author.correo
            )
        ) {
            return {
                enviado:
                    false,

                motivo:
                    "El autor del comentario tiene el mismo correo del empleado asignado."
            };
        }

        const sendTicketCommentEmail =
            getCommentEmailFunction();

        if (
            !sendTicketCommentEmail
        ) {
            return {
                enviado:
                    false,

                motivo:
                    "La función de correo para comentarios todavía no ha sido agregada."
            };
        }

        return await sendTicketCommentEmail({
            employee:
                assignedEmployee,

            ticket,

            comment
        });
    } catch (error) {
        console.error(
            "Error enviando correo del comentario:",
            error
        );

        return {
            enviado:
                false,

            motivo:
                error.message ||
                "No fue posible enviar el correo del comentario."
        };
    }
}

function getErrorStatus(
    error
) {
    if (
        Number.isInteger(
            error?.status
        )
    ) {
        return error.status;
    }

    const message =
        String(
            error?.message ||
            ""
        );

    if (
        message.includes(
            "no existe"
        )
    ) {
        return 404;
    }

    if (
        message.includes(
            "obligatorio"
        ) ||
        message.startsWith(
            "Falta"
        ) ||
        message.includes(
            "Seleccione"
        ) ||
        message.includes(
            "estructura"
        ) ||
        message.includes(
            "cantidad de rutas"
        )
    ) {
        return 400;
    }

    return 500;
}

/*
    GET /tickets/:ticketId/comments
*/
async function getComments(
    req,
    res
) {
    try {
        const {
            ticketId
        } = req.params;

        const comments =
            await getTicketComments(
                ticketId
            );

        return res
            .status(200)
            .json({
                ok:
                    true,

                comments
            });
    } catch (error) {
        console.error(
            "Error obteniendo comentarios:",
            error
        );

        return res
            .status(
                getErrorStatus(
                    error
                )
            )
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible obtener los comentarios."
            });
    }
}

/*
    POST /tickets/:ticketId/comments
*/
async function postComment(
    req,
    res
) {
    let createdComment =
        null;

    let replacementResult =
        null;

    try {
        const {
            ticketId
        } = req.params;

        const author =
            getAuthenticatedUser(
                req
            );

        const attachmentSelection =
            getAttachmentSelection(
                req
            );

        const ticket =
            await getTicketById(
                ticketId
            );

        const storage =
            await ensureTicketCommentStorage(
                ticket
            );

        createdComment =
            await createTicketComment(
                ticketId,
                {
                    autorId:
                        author.id,

                    autorNombre:
                        author.nombre,

                    autorCorreo:
                        author.correo,

                    comentario:
                        req.body
                            ?.comentario ||
                        "",

                    archivoAdjunto:
                        null,

                    googleDrive:
                        null
                }
            );

        const hasAttachment =
            Boolean(
                attachmentSelection
                    .individualFile
            ) ||
            attachmentSelection
                .folderFiles
                .length > 0;

        if (hasAttachment) {
            replacementResult =
                await prepareCommentAttachmentReplacement({
                    commentId:
                        createdComment.id,

                    commentsFolderId:
                        storage
                            .commentsFolderId,

                    currentGoogleDrive:
                        null,

                    currentAttachment:
                        null,

                    individualFile:
                        attachmentSelection
                            .individualFile,

                    folderFiles:
                        attachmentSelection
                            .folderFiles,

                    relativePaths:
                        attachmentSelection
                            .relativePaths
                });

            createdComment =
                await updateTicketCommentDriveData(
                    ticketId,
                    createdComment.id,
                    {
                        archivoAdjunto:
                            replacementResult
                                .archivoAdjunto,

                        googleDrive:
                            replacementResult
                                .googleDrive
                    }
                );
        }

        const emailResult =
            await trySendCommentEmail({
                ticket,

                comment:
                    createdComment,

                author
            });

        return res
            .status(201)
            .json({
                ok:
                    true,

                mensaje:
                    hasAttachment
                        ? "Comentario y adjunto guardados correctamente."
                        : "Comentario guardado correctamente.",

                correo:
                    emailResult,

                comment:
                    createdComment
            });
    } catch (error) {
        console.error(
            "Error creando comentario:",
            error
        );

        if (
            replacementResult
                ?.reemplazado
        ) {
            try {
                await rollbackCommentAttachmentReplacement(
                    replacementResult
                );
            } catch (
                rollbackError
            ) {
                console.error(
                    "No fue posible revertir el adjunto del comentario:",
                    rollbackError.message
                );
            }
        }

        if (
            createdComment?.id &&
            req.params?.ticketId
        ) {
            try {
                await deleteTicketComment(
                    req.params.ticketId,
                    createdComment.id
                );
            } catch (
                cleanupError
            ) {
                console.error(
                    "No fue posible eliminar el comentario incompleto:",
                    cleanupError.message
                );
            }
        }

        return res
            .status(
                getErrorStatus(
                    error
                )
            )
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible crear el comentario."
            });
    } finally {
        await deleteTemporaryFiles(
            req
        );
    }
}

/*
    PUT /tickets/:ticketId/comments/:commentId
*/
async function putComment(
    req,
    res
) {
    let replacementResult =
        null;

    try {
        const {
            ticketId,
            commentId
        } = req.params;

        const user =
            getAuthenticatedUser(
                req
            );

        const currentComment =
            await getTicketCommentById(
                ticketId,
                commentId
            );

        validateCommentPermission(
            user,
            currentComment
        );

        const ticket =
            await getTicketById(
                ticketId
            );

        const storage =
            await ensureTicketCommentStorage(
                ticket
            );

        const attachmentSelection =
            getAttachmentSelection(
                req
            );

        replacementResult =
            await prepareCommentAttachmentReplacement({
                commentId,

                commentsFolderId:
                    storage
                        .commentsFolderId,

                currentGoogleDrive:
                    currentComment
                        .googleDrive,

                currentAttachment:
                    currentComment
                        .archivoAdjunto,

                individualFile:
                    attachmentSelection
                        .individualFile,

                folderFiles:
                    attachmentSelection
                        .folderFiles,

                relativePaths:
                    attachmentSelection
                        .relativePaths
            });

        let updatedComment;

        try {
            updatedComment =
                await updateTicketComment(
                    ticketId,
                    commentId,
                    {
                        comentario:
                            req.body
                                ?.comentario ||
                            "",

                        archivoAdjunto:
                            replacementResult
                                .archivoAdjunto,

                        googleDrive:
                            replacementResult
                                .googleDrive
                    }
                );
        } catch (updateError) {
            if (
                replacementResult
                    ?.reemplazado
            ) {
                try {
                    await rollbackCommentAttachmentReplacement(
                        replacementResult
                    );
                } catch (
                    rollbackError
                ) {
                    console.error(
                        "No fue posible eliminar el adjunto nuevo después del error:",
                        rollbackError.message
                    );
                }
            }

            throw updateError;
        }

        if (
            replacementResult
                ?.reemplazado
        ) {
            try {
                await finalizeCommentAttachmentReplacement(
                    replacementResult
                );
            } catch (cleanupError) {
                console.warn(
                    "El comentario fue actualizado, pero no fue posible eliminar el adjunto anterior:",
                    cleanupError.message
                );
            }
        }

        return res
            .status(200)
            .json({
                ok:
                    true,

                mensaje:
                    replacementResult
                        ?.reemplazado
                        ? "Comentario y adjunto actualizados correctamente."
                        : "Comentario actualizado correctamente.",

                comment:
                    updatedComment
            });
    } catch (error) {
        console.error(
            "Error actualizando comentario:",
            error
        );

        return res
            .status(
                getErrorStatus(
                    error
                )
            )
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible actualizar el comentario."
            });
    } finally {
        await deleteTemporaryFiles(
            req
        );
    }
}

/*
    DELETE /tickets/:ticketId/comments/:commentId
*/
async function removeComment(
    req,
    res
) {
    try {
        const {
            ticketId,
            commentId
        } = req.params;

        const user =
            getAuthenticatedUser(
                req
            );

        validateAdmin(
            user
        );

        const comment =
            await getTicketCommentById(
                ticketId,
                commentId
            );

        const folderDeleted =
            await deleteCommentDriveStorage(
                comment
            );

        /*
            Compatibilidad con comentarios que
            pudieran tener adjunto pero no una
            carpeta de comentario registrada.
        */
        if (
            !folderDeleted &&
            comment.archivoAdjunto
        ) {
            await deleteCommentAttachment(
                comment
                    .archivoAdjunto
            );
        }

        const deletedComment =
            await deleteTicketComment(
                ticketId,
                commentId
            );

        return res
            .status(200)
            .json({
                ok:
                    true,

                mensaje:
                    "Comentario eliminado correctamente.",

                comment:
                    deletedComment
            });
    } catch (error) {
        console.error(
            "Error eliminando comentario:",
            error
        );

        return res
            .status(
                getErrorStatus(
                    error
                )
            )
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible eliminar el comentario."
            });
    }
}

module.exports = {
    getComments,
    postComment,
    putComment,
    removeComment
};