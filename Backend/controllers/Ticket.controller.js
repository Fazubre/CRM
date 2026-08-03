const fs = require("fs/promises");

const {
    createTicket,
    getTicketById,
    getAllTickets,
    updateTicket,
    updateTicketDriveData,
    deleteTicket
} = require("../models/Ticket.model");

const {
    getEmployeeById
} = require("../models/Employee.model");

const {
    sendTicketAssignmentEmail
} = require("../services/GoogleMail");

const {
    createTicketDriveStorage,
    ensureTicketDriveStorage,
    uploadTicketAttachment,
    prepareTicketAttachmentReplacement,
    deleteTicketAttachment,
    deleteTicketDriveStorage
} = require("../services/GoogleDrive/TicketDrive");

function getUploadedFiles(req) {
    if (!req.files || typeof req.files !== "object") {
        return [];
    }

    const individualFiles = Array.isArray(req.files.archivo)
        ? req.files.archivo
        : [];

    const folderFiles = Array.isArray(req.files.carpetaArchivos)
        ? req.files.carpetaArchivos
        : [];

    return [
        ...individualFiles,
        ...folderFiles
    ];
}

async function deleteTemporaryFiles(req) {
    const files = getUploadedFiles(req);

    await Promise.all(
        files.map(async (file) => {
            if (!file?.path) {
                return;
            }

            try {
                await fs.unlink(file.path);

                console.log(
                    "Archivo temporal eliminado:",
                    file.path
                );
            } catch (error) {
                console.warn(
                    "No fue posible eliminar el archivo temporal:",
                    file.path,
                    error.message
                );
            }
        })
    );
}

function parseFolderPaths(req, folderFiles) {
    if (
        !Array.isArray(folderFiles) ||
        folderFiles.length === 0
    ) {
        return [];
    }

    const pathsText =
        req.body?.rutasCarpeta ||
        "[]";

    let relativePaths;

    try {
        relativePaths =
            JSON.parse(pathsText);
    } catch (error) {
        throw new Error(
            "No fue posible interpretar la estructura de la carpeta."
        );
    }

    if (!Array.isArray(relativePaths)) {
        throw new Error(
            "La estructura de la carpeta no tiene un formato válido."
        );
    }

    if (
        relativePaths.length !==
        folderFiles.length
    ) {
        throw new Error(
            "La cantidad de rutas no coincide con la cantidad de archivos recibidos."
        );
    }

    return relativePaths;
}

function getAttachmentSelection(req) {
    const individualFile =
        req.files?.archivo?.[0] ||
        null;

    const folderFiles =
        Array.isArray(
            req.files?.carpetaArchivos
        )
            ? req.files.carpetaArchivos
            : [];

    if (
        individualFile &&
        folderFiles.length > 0
    ) {
        throw new Error(
            "Seleccione un archivo individual o una carpeta, no ambos."
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

function buildCreateTicketData(req) {
    return {
        usuarioId:
            req.body?.usuarioId ||
            "",

        usuarioNombre:
            req.body?.usuarioNombre ||
            "Usuario",

        titulo:
            req.body?.titulo ||
            "",

        descripcion:
            req.body?.descripcion ||
            "",

        prioridad:
            req.body?.prioridad ||
            "media",

        fechaVencimiento:
            req.body?.fechaVencimiento ||
            null,

        empleadoId:
            req.body?.empleadoId ||
            "",

        empleadoNombre:
            req.body?.empleadoNombre ||
            "No asignado",

        clienteId:
            req.body?.clienteId ||
            "",

        clienteNombre:
            req.body?.clienteNombre ||
            "No asignado",

        areaId:
            req.body?.areaId ||
            "",

        areaName:
            req.body?.areaName ||
            "No asignada",

        archivoAdjunto:
            null,

        googleDrive:
            null
    };
}

function buildUpdateTicketData(req) {
    return {
        titulo:
            req.body?.titulo ||
            "",

        descripcion:
            req.body?.descripcion ||
            "",

        prioridad:
            req.body?.prioridad ||
            "media",

        estado:
            req.body?.estado ||
            "abierto",

        fechaVencimiento:
            req.body?.fechaVencimiento ||
            null,

        empleadoId:
            req.body?.empleadoId ||
            "",

        empleadoNombre:
            req.body?.empleadoNombre ||
            "No asignado",

        clienteId:
            req.body?.clienteId ||
            "",

        clienteNombre:
            req.body?.clienteNombre ||
            "No asignado",

        areaId:
            req.body?.areaId ||
            "",

        areaName:
            req.body?.areaName ||
            "No asignada"
    };
}

function getAttachmentMessage(
    attachment,
    editMode = false
) {
    if (
        attachment?.tipoAdjunto ===
        "carpeta"
    ) {
        return editMode
            ? "Ticket y carpeta actualizados correctamente."
            : "Ticket y carpeta creados correctamente.";
    }

    if (
        attachment?.tipoAdjunto ===
        "archivo"
    ) {
        return editMode
            ? "Ticket y archivo actualizados correctamente."
            : "Ticket y archivo creados correctamente.";
    }

    return editMode
        ? "Ticket actualizado correctamente."
        : "Ticket creado correctamente.";
}

async function trySendAssignmentEmail(ticket) {
    if (!ticket?.empleadoId) {
        return {
            enviado:
                false,

            motivo:
                "El ticket no tiene empleado asignado."
        };
    }

    try {
        const employee =
            await getEmployeeById(
                ticket.empleadoId
            );

        if (!employee) {
            return {
                enviado:
                    false,

                motivo:
                    "No se encontró el empleado asignado."
            };
        }

        const employeeEmail =
            employee.correo ||
            employee.email ||
            "";

        if (!employeeEmail) {
            return {
                enviado:
                    false,

                motivo:
                    "El empleado asignado no tiene correo registrado."
            };
        }

        const emailResult =
            await sendTicketAssignmentEmail({
                employee: {
                    ...employee,

                    correo:
                        employeeEmail
                },

                ticket
            });

        if (emailResult?.enviado) {
            console.log(
                "Correo de asignación enviado:",
                {
                    ticketId:
                        ticket.id,

                    empleadoId:
                        ticket.empleadoId,

                    destinatario:
                        emailResult
                            .destinatario
                }
            );
        } else {
            console.warn(
                "El ticket fue creado, pero no se envió el correo de asignación:",
                emailResult?.motivo ||
                "Motivo desconocido."
            );
        }

        return emailResult;
    } catch (error) {
        console.error(
            "Error enviando correo de asignación:",
            error
        );

        return {
            enviado:
                false,

            motivo:
                error.message ||
                "No fue posible enviar el correo de asignación."
        };
    }
}

async function postTicket(req, res) {
    let ticketCreated =
        null;

    let driveStructure =
        null;

    try {
        const attachmentSelection =
            getAttachmentSelection(req);

        const ticketData =
            buildCreateTicketData(req);

        ticketCreated =
            await createTicket(
                ticketData
            );

        driveStructure =
            await createTicketDriveStorage(
                ticketCreated
            );

        const attachment =
            await uploadTicketAttachment({
                individualFile:
                    attachmentSelection
                        .individualFile,

                folderFiles:
                    attachmentSelection
                        .folderFiles,

                relativePaths:
                    attachmentSelection
                        .relativePaths,

                attachmentFolderId:
                    driveStructure
                        .ticketAttachmentFolder
                        .id
            });

        const finalTicket =
            await updateTicketDriveData(
                ticketCreated.id,
                {
                    googleDrive:
                        driveStructure,

                    archivoAdjunto:
                        attachment
                }
            );

        /*
         * El correo se intenta enviar cuando el
         * ticket y su estructura de Drive ya fueron
         * creados correctamente.
         *
         * Si Gmail falla, el ticket no se elimina.
         */
        const emailResult =
            await trySendAssignmentEmail(
                finalTicket
            );

        return res
            .status(201)
            .json({
                ok:
                    true,

                mensaje:
                    getAttachmentMessage(
                        attachment,
                        false
                    ),

                ticket:
                    finalTicket,

                correo:
                    emailResult
            });
    } catch (error) {
        console.error(
            "Error creando ticket:",
            error
        );

        if (
            driveStructure
                ?.ticketFolder
                ?.id
        ) {
            try {
                await deleteTicketDriveStorage({
                    googleDrive:
                        driveStructure
                });
            } catch (driveCleanupError) {
                console.error(
                    "No fue posible eliminar la carpeta creada después del error:",
                    driveCleanupError.message
                );
            }
        }

        if (ticketCreated?.id) {
            try {
                await deleteTicket(
                    ticketCreated.id
                );
            } catch (ticketCleanupError) {
                console.error(
                    "No fue posible eliminar el ticket incompleto:",
                    ticketCleanupError.message
                );
            }
        }

        return res
            .status(400)
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible crear el ticket."
            });
    } finally {
        await deleteTemporaryFiles(req);
    }
}

async function getTickets(req, res) {
    try {
        const tickets =
            await getAllTickets();

        return res
            .status(200)
            .json({
                ok:
                    true,

                tickets
            });
    } catch (error) {
        console.error(
            "Error obteniendo tickets:",
            error
        );

        return res
            .status(500)
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible obtener los tickets."
            });
    }
}

async function getTicket(req, res) {
    try {
        const {
            id
        } = req.params;

        const ticket =
            await getTicketById(id);

        const storageResult =
            await ensureTicketDriveStorage(
                ticket
            );

        let finalTicket =
            ticket;

        if (storageResult.created) {
            finalTicket =
                await updateTicketDriveData(
                    id,
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

        return res
            .status(200)
            .json({
                ok:
                    true,

                ticket:
                    finalTicket
            });
    } catch (error) {
        console.error(
            "Error obteniendo ticket:",
            error
        );

        const status =
            error.message ===
            "El ticket no existe."
                ? 404
                : 500;

        return res
            .status(status)
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible obtener el ticket."
            });
    }
}

async function putTicket(req, res) {
    let replacementResult =
        null;

    try {
        const {
            id
        } = req.params;

        const attachmentSelection =
            getAttachmentSelection(req);

        const currentTicket =
            await getTicketById(id);

        const storageResult =
            await ensureTicketDriveStorage(
                currentTicket
            );

        if (storageResult.created) {
            await updateTicketDriveData(
                id,
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

        const currentAttachment =
            storageResult
                .archivoAdjunto ||
            currentTicket
                .archivoAdjunto ||
            null;

        replacementResult =
            await prepareTicketAttachmentReplacement({
                currentAttachment,

                individualFile:
                    attachmentSelection
                        .individualFile,

                folderFiles:
                    attachmentSelection
                        .folderFiles,

                relativePaths:
                    attachmentSelection
                        .relativePaths,

                attachmentFolderId:
                    storageResult
                        .googleDrive
                        .ticketAttachmentFolder
                        .id
            });

        const ticketData = {
            ...buildUpdateTicketData(req),

            archivoAdjunto:
                replacementResult
                    .archivoAdjunto
        };

        let updatedTicket;

        try {
            updatedTicket =
                await updateTicket(
                    id,
                    ticketData
                );
        } catch (updateError) {
            if (
                replacementResult
                    .reemplazado
            ) {
                try {
                    await deleteTicketAttachment(
                        replacementResult
                            .archivoAdjunto
                    );
                } catch (cleanupError) {
                    console.error(
                        "No fue posible eliminar el nuevo adjunto después del error:",
                        cleanupError.message
                    );
                }
            }

            throw updateError;
        }

        if (
            replacementResult
                .reemplazado &&
            replacementResult
                .adjuntoAnteriorId
        ) {
            try {
                await deleteTicketAttachment(
                    replacementResult
                        .adjuntoAnteriorId
                );
            } catch (error) {
                console.warn(
                    "El ticket fue actualizado, pero no fue posible eliminar el adjunto anterior:",
                    error.message
                );
            }
        }

        return res
            .status(200)
            .json({
                ok:
                    true,

                mensaje:
                    getAttachmentMessage(
                        replacementResult
                            .reemplazado
                            ? replacementResult
                                .archivoAdjunto
                            : null,

                        true
                    ),

                ticket:
                    updatedTicket
            });
    } catch (error) {
        console.error(
            "Error actualizando ticket:",
            error
        );

        const status =
            error.message ===
            "El ticket no existe."
                ? 404
                : 400;

        return res
            .status(status)
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible actualizar el ticket."
            });
    } finally {
        await deleteTemporaryFiles(req);
    }
}

async function removeTicket(req, res) {
    try {
        const {
            id
        } = req.params;

        const currentTicket =
            await getTicketById(id);

        const storageResult =
            await ensureTicketDriveStorage(
                currentTicket
            );

        const ticketWithDrive = {
            ...currentTicket,

            googleDrive:
                storageResult
                    .googleDrive,

            archivoAdjunto:
                storageResult
                    .archivoAdjunto
        };

        await deleteTicketDriveStorage(
            ticketWithDrive
        );

        const deletedTicket =
            await deleteTicket(id);

        return res
            .status(200)
            .json({
                ok:
                    true,

                mensaje:
                    "Ticket, comentarios y archivos eliminados correctamente.",

                ticket:
                    deletedTicket
            });
    } catch (error) {
        console.error(
            "Error eliminando ticket:",
            error
        );

        const status =
            error.message ===
            "El ticket no existe."
                ? 404
                : 500;

        return res
            .status(status)
            .json({
                ok:
                    false,

                mensaje:
                    error.message ||
                    "No fue posible eliminar el ticket."
            });
    }
}

module.exports = {
    postTicket,
    getTickets,
    getTicket,
    putTicket,
    removeTicket
};