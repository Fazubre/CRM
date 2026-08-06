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

const DASHBOARD_DAYS_AHEAD = 7;

function normalizeValue(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function getEmployeeRole(employee) {
    if (!employee) {
        return "";
    }

    if (Array.isArray(employee.roles)) {
        const roles = employee.roles
            .map(normalizeValue)
            .filter(Boolean);

        if (roles.includes("admin")) {
            return "admin";
        }

        return roles[0] || "";
    }

    return normalizeValue(
        employee.rol ||
        employee.role ||
        employee.tipoRol ||
        employee.tipo_usuario
    );
}

function isAdminEmployee(employee) {
    return getEmployeeRole(employee) === "admin";
}

function getPublicEmployee(employee) {
    return {
        id:
            employee?.id ||
            employee?.employeeId ||
            "",

        google_id:
            employee?.google_id ||
            employee?.googleId ||
            "",

        nombre:
            employee?.nombre ||
            employee?.name ||
            "",

        correo:
            employee?.correo ||
            employee?.email ||
            "",

        foto_url:
            employee?.foto_url ||
            employee?.picture ||
            "",

        rol:
            getEmployeeRole(employee),

        activo:
            employee?.activo !== false
    };
}

function getEmployeeIdentifiers(employee) {
    return new Set(
        [
            employee?.id,
            employee?.employeeId,
            employee?.empleadoId,
            employee?.google_id,
            employee?.googleId
        ]
            .map(normalizeValue)
            .filter(Boolean)
    );
}

function ticketIsAssignedToEmployee(
    ticket,
    employee
) {
    const employeeIdentifiers =
        getEmployeeIdentifiers(employee);

    const ticketEmployeeIdentifiers = [
        ticket?.empleadoId,
        ticket?.employeeId,
        ticket?.assignedEmployeeId,
        ticket?.assignedToId
    ]
        .map(normalizeValue)
        .filter(Boolean);

    return ticketEmployeeIdentifiers.some(
        (identifier) => {
            return employeeIdentifiers.has(
                identifier
            );
        }
    );
}

function parseDateValue(value) {
    if (!value) {
        return null;
    }

    let date = null;

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        date = value.toDate();
    } else if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {
        date = new Date(
            value.seconds * 1000
        );
    } else if (
        typeof value === "object" &&
        typeof value._seconds === "number"
    ) {
        date = new Date(
            value._seconds * 1000
        );
    } else if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        const [
            year,
            month,
            day
        ] = value
            .split("-")
            .map(Number);

        date = new Date(
            year,
            month - 1,
            day
        );
    } else {
        date = new Date(value);
    }

    if (
        !date ||
        Number.isNaN(date.getTime())
    ) {
        return null;
    }

    return date;
}

function getTicketDueDate(ticket) {
    return parseDateValue(
        ticket?.expirationDate ||
        ticket?.fechaVencimiento ||
        ticket?.dueDate
    );
}

function getTicketCreationDate(ticket) {
    return parseDateValue(
        ticket?.createdAt ||
        ticket?.fecha_creacion
    );
}

function isTicketCompleted(ticket) {
    if (ticket?.isCompleted === true) {
        return true;
    }

    const status = normalizeValue(
        ticket?.estadoNombre ||
        ticket?.estado
    );

    return [
        "completado",
        "completa",
        "cerrado",
        "cerrada"
    ].includes(status);
}

function getStartOfToday() {
    const date = new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}

function isTicketOverdue(ticket) {
    if (isTicketCompleted(ticket)) {
        return false;
    }

    const dueDate =
        getTicketDueDate(ticket);

    return Boolean(
        dueDate &&
        dueDate < getStartOfToday()
    );
}

function isTicketDueSoon(ticket) {
    if (
        isTicketCompleted(ticket) ||
        isTicketOverdue(ticket)
    ) {
        return false;
    }

    const dueDate =
        getTicketDueDate(ticket);

    if (!dueDate) {
        return false;
    }

    const today =
        getStartOfToday();

    const limit =
        new Date(today);

    limit.setDate(
        limit.getDate() +
        DASHBOARD_DAYS_AHEAD
    );

    return (
        dueDate >= today &&
        dueDate <= limit
    );
}

function isHighPriority(ticket) {
    const priority =
        normalizeValue(
            ticket?.prioridad
        );

    return [
        "alta",
        "critica",
        "crítica"
    ].includes(priority);
}

function getPriorityWeight(ticket) {
    const priority =
        normalizeValue(
            ticket?.prioridad
        );

    const weights = {
        critica: 4,
        "crítica": 4,
        alta: 3,
        media: 2,
        baja: 1
    };

    return weights[priority] || 0;
}

function sortDashboardTickets(tickets) {
    return [
        ...tickets
    ].sort(
        (
            ticketA,
            ticketB
        ) => {
            const overdueDifference =
                Number(
                    isTicketOverdue(ticketB)
                ) -
                Number(
                    isTicketOverdue(ticketA)
                );

            if (overdueDifference !== 0) {
                return overdueDifference;
            }

            const dueSoonDifference =
                Number(
                    isTicketDueSoon(ticketB)
                ) -
                Number(
                    isTicketDueSoon(ticketA)
                );

            if (dueSoonDifference !== 0) {
                return dueSoonDifference;
            }

            const priorityDifference =
                getPriorityWeight(ticketB) -
                getPriorityWeight(ticketA);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            const dateA =
                getTicketCreationDate(ticketA)
                    ?.getTime() ||
                0;

            const dateB =
                getTicketCreationDate(ticketB)
                    ?.getTime() ||
                0;

            return dateB - dateA;
        }
    );
}

function buildDashboardSummary(tickets) {
    const summary = {
        total: tickets.length,
        abiertos: 0,
        completados: 0,
        altaPrioridad: 0,
        vencidos: 0,
        proximos: 0,
        sinFecha: 0
    };

    tickets.forEach(
        (ticket) => {
            if (isTicketCompleted(ticket)) {
                summary.completados += 1;
            } else {
                summary.abiertos += 1;
            }

            if (isHighPriority(ticket)) {
                summary.altaPrioridad += 1;
            }

            if (isTicketOverdue(ticket)) {
                summary.vencidos += 1;
            }

            if (isTicketDueSoon(ticket)) {
                summary.proximos += 1;
            }

            if (!getTicketDueDate(ticket)) {
                summary.sinFecha += 1;
            }
        }
    );

    return summary;
}

function getUploadedFiles(req) {
    if (
        !req.files ||
        typeof req.files !== "object"
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
            req.files.carpetaArchivos
        )
            ? req.files.carpetaArchivos
            : [];

    return [
        ...individualFiles,
        ...folderFiles
    ];
}

async function deleteTemporaryFiles(req) {
    const files =
        getUploadedFiles(req);

    await Promise.all(
        files.map(
            async (file) => {
                if (!file?.path) {
                    return;
                }

                try {
                    await fs.unlink(
                        file.path
                    );

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
            }
        )
    );
}

function parseFolderPaths(
    req,
    folderFiles
) {
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
            req.user?.id ||
            req.user?.employeeId ||
            "",

        usuarioNombre:
            req.body?.usuarioNombre ||
            req.user?.nombre ||
            req.user?.correo ||
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
            enviado: false,
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
                enviado: false,
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
                enviado: false,
                motivo:
                    "El empleado asignado no tiene correo registrado."
            };
        }

        const emailResult =
            await sendTicketAssignmentEmail({
                employee: {
                    ...employee,
                    correo: employeeEmail
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
                        emailResult.destinatario
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
            enviado: false,

            motivo:
                error.message ||
                "No fue posible enviar el correo de asignación."
        };
    }
}

async function postTicket(req, res) {
    let ticketCreated = null;
    let driveStructure = null;

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

        const emailResult =
            await trySendAssignmentEmail(
                finalTicket
            );

        return res
            .status(201)
            .json({
                ok: true,

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
                ok: false,

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
                ok: true,
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
                ok: false,

                mensaje:
                    error.message ||
                    "No fue posible obtener los tickets."
            });
    }
}

async function getDashboardTickets(
    req,
    res
) {
    try {
        const employee =
            req.user;

        if (!employee) {
            return res
                .status(401)
                .json({
                    ok: false,

                    mensaje:
                        "Debe iniciar sesión para acceder a este recurso."
                });
        }

        const allTickets =
            await getAllTickets();

        const admin =
            isAdminEmployee(
                employee
            );

        const visibleTickets =
            admin
                ? allTickets
                : allTickets.filter(
                    (ticket) => {
                        return ticketIsAssignedToEmployee(
                            ticket,
                            employee
                        );
                    }
                );

        const tickets =
            sortDashboardTickets(
                visibleTickets
            );

        return res
            .status(200)
            .json({
                ok: true,

                alcance:
                    admin
                        ? "general"
                        : "personal",

                diasProximos:
                    DASHBOARD_DAYS_AHEAD,

                usuario:
                    getPublicEmployee(
                        employee
                    ),

                resumen:
                    buildDashboardSummary(
                        tickets
                    ),

                tickets
            });
    } catch (error) {
        console.error(
            "Error obteniendo dashboard de tickets:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,

                mensaje:
                    error.message ||
                    "No fue posible cargar el dashboard."
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
                ok: true,

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
                ok: false,

                mensaje:
                    error.message ||
                    "No fue posible obtener el ticket."
            });
    }
}

async function putTicket(req, res) {
    let replacementResult = null;

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
                ok: true,

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
                ok: false,

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
        if (
            !isAdminEmployee(
                req.user
            )
        ) {
            return res
                .status(403)
                .json({
                    ok: false,

                    mensaje:
                        "Solo los administradores pueden eliminar tickets."
                });
        }

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
                ok: true,

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
                ok: false,

                mensaje:
                    error.message ||
                    "No fue posible eliminar el ticket."
            });
    }
}

module.exports = {
    postTicket,
    getTickets,
    getDashboardTickets,
    getTicket,
    putTicket,
    removeTicket
};