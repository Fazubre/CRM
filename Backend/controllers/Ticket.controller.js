const fs = require("fs/promises");

const {
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket,
    updateTicketCalendarData
} = require("../models/Ticket.model");

const {
    getEmployeeById
} = require("../models/Employee.model");

const {
    sendTicketAssignmentEmail
} = require("../services/GoogleMail");

const {
    uploadTicketFileWithOAuth,
    uploadTicketFolderWithOAuth
} = require("../services/GoogleDriveOAuth");

const {
    crearEventoTicket
} = require("../services/GoogleCalendar");

const MAX_FOLDER_TOTAL_SIZE = 100 * 1024 * 1024;

function getUploadedFiles(req) {
    if (!req.files || typeof req.files !== "object") {
        return [];
    }

    const archivoIndividual =
        Array.isArray(req.files.archivo)
            ? req.files.archivo
            : [];

    const archivosCarpeta =
        Array.isArray(req.files.carpetaArchivos)
            ? req.files.carpetaArchivos
            : [];

    return [
        ...archivoIndividual,
        ...archivosCarpeta
    ];
}

async function eliminarArchivosTemporales(req) {
    const archivos = getUploadedFiles(req);

    await Promise.all(
        archivos.map(async (archivo) => {
            if (!archivo?.path) {
                return;
            }

            try {
                await fs.unlink(archivo.path);

                console.log(
                    "Archivo temporal eliminado:",
                    archivo.path
                );
            } catch (error) {
                console.warn(
                    "No se pudo eliminar el archivo temporal:",
                    archivo.path,
                    error.message
                );
            }
        })
    );
}

function parseRutasCarpeta(req) {
    const rutasTexto =
        req.body?.rutasCarpeta || "[]";

    let rutasRelativas;

    try {
        rutasRelativas =
            JSON.parse(rutasTexto);
    } catch (error) {
        throw new Error(
            "No fue posible interpretar la estructura de la carpeta."
        );
    }

    if (!Array.isArray(rutasRelativas)) {
        throw new Error(
            "La estructura de la carpeta no tiene un formato válido."
        );
    }

    return rutasRelativas;
}

function calcularTamanoTotal(archivos) {
    return archivos.reduce(
        (total, archivo) => {
            return total + Number(archivo.size || 0);
        },
        0
    );
}

async function construirArchivoAdjuntoDrive(req) {
    const archivoIndividual =
        req.files?.archivo?.[0] || null;

    const archivosCarpeta =
        Array.isArray(req.files?.carpetaArchivos)
            ? req.files.carpetaArchivos
            : [];

    if (
        archivoIndividual &&
        archivosCarpeta.length > 0
    ) {
        throw new Error(
            "Seleccione un archivo individual o una carpeta, no ambos."
        );
    }

    if (
        !archivoIndividual &&
        archivosCarpeta.length === 0
    ) {
        return null;
    }

    const refreshToken =
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (!refreshToken) {
        throw new Error(
            "Falta GOOGLE_DRIVE_REFRESH_TOKEN en las variables de entorno."
        );
    }

    if (archivoIndividual) {
        console.log(
            "Subiendo archivo individual a Google Drive:",
            {
                originalname:
                    archivoIndividual.originalname,

                mimetype:
                    archivoIndividual.mimetype,

                size:
                    archivoIndividual.size,

                path:
                    archivoIndividual.path
            }
        );

        const archivoDrive =
            await uploadTicketFileWithOAuth(
                archivoIndividual,
                refreshToken
            );

        if (!archivoDrive?.id) {
            throw new Error(
                "Google Drive no devolvió la información del archivo."
            );
        }

        return {
            tipoAdjunto: "archivo",

            id:
                archivoDrive.id,

            googleDriveId:
                archivoDrive.id,

            nombre:
                archivoDrive.nombre ||
                archivoIndividual.originalname,

            tipo:
                archivoIndividual.mimetype,

            tamano:
                archivoIndividual.size,

            cantidadArchivos: 1,

            webViewLink:
                archivoDrive.webViewLink || "",

            webContentLink:
                archivoDrive.webContentLink || "",

            url:
                archivoDrive.webViewLink || "",

            enlace:
                archivoDrive.webViewLink || "",

            fechaSubida:
                new Date().toISOString()
        };
    }

    const tamanoTotal =
        calcularTamanoTotal(
            archivosCarpeta
        );

    if (
        tamanoTotal >
        MAX_FOLDER_TOTAL_SIZE
    ) {
        throw new Error(
            "La carpeta no puede superar los 100 MB en total."
        );
    }

    const rutasRelativas =
        parseRutasCarpeta(req);

    if (
        rutasRelativas.length !==
        archivosCarpeta.length
    ) {
        throw new Error(
            "La cantidad de rutas no coincide con la cantidad de archivos recibidos."
        );
    }

    console.log(
        "Subiendo carpeta a Google Drive:",
        {
            cantidadArchivos:
                archivosCarpeta.length,

            tamanoTotal,

            primeraRuta:
                rutasRelativas[0] || ""
        }
    );

    const carpetaDrive =
        await uploadTicketFolderWithOAuth(
            archivosCarpeta,
            rutasRelativas,
            refreshToken
        );

    if (!carpetaDrive?.id) {
        throw new Error(
            "Google Drive no devolvió la información de la carpeta."
        );
    }

    return {
        tipoAdjunto: "carpeta",

        id:
            carpetaDrive.id,

        googleDriveId:
            carpetaDrive.id,

        nombre:
            carpetaDrive.nombre ||
            "Carpeta del ticket",

        tipo:
            "application/vnd.google-apps.folder",

        cantidadArchivos:
            carpetaDrive.cantidadArchivos ||
            archivosCarpeta.length,

        tamano:
            tamanoTotal,

        webViewLink:
            carpetaDrive.webViewLink || "",

        webContentLink: "",

        url:
            carpetaDrive.webViewLink || "",

        enlace:
            carpetaDrive.webViewLink || "",

        fechaSubida:
            new Date().toISOString()
    };
}

async function intentarEnviarCorreoAsignacion(ticket) {
    if (!ticket?.empleadoId) {
        return {
            enviado: false,
            motivo: "El ticket no tiene empleado asignado."
        };
    }

    try {
        const empleado =
            await getEmployeeById(ticket.empleadoId);

        if (!empleado?.correo) {
            return {
                enviado: false,
                motivo: "El empleado no tiene correo registrado."
            };
        }

        return await sendTicketAssignmentEmail({
            employee: empleado,
            ticket
        });
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

async function guardarErrorCalendarSiEsPosible(ticket, error) {
    if (!ticket?.id) {
        return;
    }

    try {
        await updateTicketCalendarData(ticket.id, {
            calendarSyncStatus: "error",
            calendarSyncError:
                error.message ||
                "No fue posible crear el evento en Google Calendar.",
            calendarUpdatedAt: new Date().toISOString()
        });
    } catch (errorGuardando) {
        console.error(
            "No fue posible guardar el error de Calendar en el ticket:",
            errorGuardando
        );
    }
}

async function intentarCrearEventoCalendar(ticket) {
    if (!ticket?.empleadoId) {
        return {
            creado: false,
            motivo: "El ticket no tiene empleado asignado."
        };
    }

    if (!ticket?.fechaVencimiento) {
        return {
            creado: false,
            motivo: "El ticket no tiene fecha de vencimiento."
        };
    }

    try {
        const empleado =
            await getEmployeeById(ticket.empleadoId);

        const refreshToken =
            empleado?.google_calendar?.refresh_token || "";

        const calendarConectado =
            empleado?.google_calendar?.conectado === true;

        if (!calendarConectado || !refreshToken) {
            return {
                creado: false,
                motivo: "El empleado no tiene Google Calendar conectado."
            };
        }

        const evento =
            await crearEventoTicket({
                refreshToken,
                titulo: ticket.titulo,
                descripcion: construirDescripcionEvento(ticket),
                fechaVencimiento: ticket.fechaVencimiento
            });

        await updateTicketCalendarData(ticket.id, {
            calendarEventId:
                evento.id || "",

            calendarEventLink:
                evento.htmlLink || "",

            calendarSyncStatus:
                "created",

            calendarSyncError:
                "",

            calendarUpdatedAt:
                new Date().toISOString()
        });

        return {
            creado: true,
            eventId: evento.id || "",
            eventLink: evento.htmlLink || ""
        };
    } catch (error) {
        console.error(
            "Error creando evento de Google Calendar:",
            error
        );

        await guardarErrorCalendarSiEsPosible(
            ticket,
            error
        );

        return {
            creado: false,
            motivo:
                error.message ||
                "No fue posible crear el evento en Google Calendar."
        };
    }
}

function construirDescripcionEvento(ticket) {
    return [
        "Ticket asignado desde CRM Voyager.",
        "",
        `Ticket: #${ticket.numeroTicket || ""}`,
        `Título: ${ticket.titulo || "Sin título"}`,
        `Cliente: ${ticket.clienteNombre || "No asignado"}`,
        `Área: ${ticket.areaName || "No asignada"}`,
        `Prioridad: ${ticket.prioridad || "media"}`,
        `Empleado asignado: ${ticket.empleadoNombre || "No asignado"}`,
        "",
        `Descripción: ${ticket.descripcion || "Sin descripción"}`
    ].join("\n");
}

function debeEnviarCorreoPorCambioEmpleado(
    ticketAnterior,
    ticketActualizado
) {
    const empleadoAnteriorId =
        String(ticketAnterior?.empleadoId || "");

    const empleadoNuevoId =
        String(ticketActualizado?.empleadoId || "");

    if (!empleadoNuevoId) {
        return false;
    }

    return empleadoAnteriorId !== empleadoNuevoId;
}

function debeCrearEventoCalendar(
    ticketAnterior,
    ticketActualizado
) {
    const empleadoAnteriorId =
        String(ticketAnterior?.empleadoId || "");

    const empleadoNuevoId =
        String(ticketActualizado?.empleadoId || "");

    const fechaAnterior =
        String(ticketAnterior?.fechaVencimiento || "");

    const fechaNueva =
        String(ticketActualizado?.fechaVencimiento || "");

    if (!empleadoNuevoId || !fechaNueva) {
        return false;
    }

    if (empleadoAnteriorId !== empleadoNuevoId) {
        return true;
    }

    if (fechaAnterior !== fechaNueva) {
        return true;
    }

    if (!ticketAnterior?.calendarEventId) {
        return true;
    }

    return false;
}

async function postTicket(req, res) {
    try {
        console.log(
            "TICKET CONTROLLER VERSION: 2026-06-08-CALENDAR-V1"
        );

        console.log(
            "Content-Type:",
            req.headers["content-type"]
        );

        console.log(
            "Datos recibidos:",
            req.body
        );

        console.log(
            "Archivos recibidos:",
            {
                archivoIndividual:
                    req.files?.archivo?.length || 0,

                archivosCarpeta:
                    req.files?.carpetaArchivos?.length || 0
            }
        );

        const archivoAdjunto =
            await construirArchivoAdjuntoDrive(req);

        const datosTicket = {
            usuarioId:
                req.body?.usuarioId || "",

            usuarioNombre:
                req.body?.usuarioNombre ||
                "Usuario",

            titulo:
                req.body?.titulo || "",

            descripcion:
                req.body?.descripcion || "",

            prioridad:
                req.body?.prioridad ||
                "media",

            fechaVencimiento:
                req.body?.fechaVencimiento ||
                null,

            empleadoId:
                req.body?.empleadoId || "",

            empleadoNombre:
                req.body?.empleadoNombre ||
                "No asignado",

            clienteId:
                req.body?.clienteId || "",

            clienteNombre:
                req.body?.clienteNombre ||
                "No asignado",

            areaId:
                req.body?.areaId || "",

            areaName:
                req.body?.areaName ||
                "No asignada",

            archivoAdjunto
        };

        console.log(
            "Objeto enviado al modelo:",
            datosTicket
        );

        const ticketCreado =
            await createTicket(
                datosTicket
            );

        const resultadoCorreo =
            await intentarEnviarCorreoAsignacion(
                ticketCreado
            );

        const resultadoCalendar =
            await intentarCrearEventoCalendar(
                ticketCreado
            );

        return res.status(201).json({
            ok: true,

            version:
                "2026-06-08-CALENDAR-V1",

            mensaje:
                archivoAdjunto?.tipoAdjunto === "carpeta"
                    ? "Ticket y carpeta creados correctamente."
                    : archivoAdjunto?.tipoAdjunto === "archivo"
                        ? "Ticket y archivo creados correctamente."
                        : "Ticket creado correctamente.",

            correoAsignacion:
                resultadoCorreo,

            calendar:
                resultadoCalendar,

            ticket:
                ticketCreado
        });
    } catch (error) {
        console.error(
            "Error creando ticket:",
            error
        );

        console.error(
            "Stack:",
            error.stack
        );

        return res.status(400).json({
            ok: false,

            version:
                "2026-06-08-CALENDAR-V1",

            mensaje:
                error.message ||
                "No fue posible crear el ticket."
        });
    } finally {
        await eliminarArchivosTemporales(req);
    }
}

async function getTickets(req, res) {
    try {
        const tickets =
            await getAllTickets();

        return res.status(200).json({
            ok: true,
            tickets
        });
    } catch (error) {
        console.error(
            "Error obteniendo tickets:",
            error
        );

        return res.status(500).json({
            ok: false,

            mensaje:
                error.message ||
                "No fue posible obtener los tickets."
        });
    }
}

async function putTicket(req, res) {
    try {
        console.log(
            "PUT TICKET CONTROLLER VERSION: 2026-06-08-CALENDAR-V1"
        );

        console.log(
            "Content-Type:",
            req.headers["content-type"]
        );

        console.log(
            "Datos recibidos:",
            req.body
        );

        console.log(
            "Archivos recibidos:",
            {
                archivoIndividual:
                    req.files?.archivo?.length || 0,

                archivosCarpeta:
                    req.files?.carpetaArchivos?.length || 0
            }
        );

        const { id } = req.params;

        const ticketAnterior =
            await getTicketById(id);

        const archivoAdjunto =
            await construirArchivoAdjuntoDrive(req);

        const datosTicket = {
            titulo:
                req.body?.titulo || "",

            descripcion:
                req.body?.descripcion || "",

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
                req.body?.empleadoId || "",

            empleadoNombre:
                req.body?.empleadoNombre ||
                "No asignado",

            clienteId:
                req.body?.clienteId || "",

            clienteNombre:
                req.body?.clienteNombre ||
                "No asignado",

            areaId:
                req.body?.areaId || "",

            areaName:
                req.body?.areaName ||
                "No asignada",

            archivoAdjunto
        };

        const ticketActualizado =
            await updateTicket(
                id,
                datosTicket
            );

        let resultadoCorreo = {
            enviado: false,
            motivo: "El empleado asignado no cambió."
        };

        if (
            debeEnviarCorreoPorCambioEmpleado(
                ticketAnterior,
                ticketActualizado
            )
        ) {
            resultadoCorreo =
                await intentarEnviarCorreoAsignacion(
                    ticketActualizado
                );
        }

        let resultadoCalendar = {
            creado: false,
            motivo: "No hubo cambios relevantes para Google Calendar."
        };

        if (
            debeCrearEventoCalendar(
                ticketAnterior,
                ticketActualizado
            )
        ) {
            resultadoCalendar =
                await intentarCrearEventoCalendar(
                    ticketActualizado
                );
        }

        return res.status(200).json({
            ok: true,

            version:
                "2026-06-08-CALENDAR-V1",

            mensaje:
                archivoAdjunto?.tipoAdjunto === "carpeta"
                    ? "Ticket y carpeta actualizados correctamente."
                    : archivoAdjunto?.tipoAdjunto === "archivo"
                        ? "Ticket y archivo actualizados correctamente."
                        : "Ticket actualizado correctamente.",

            correoAsignacion:
                resultadoCorreo,

            calendar:
                resultadoCalendar,

            ticket:
                ticketActualizado
        });
    } catch (error) {
        console.error(
            "Error actualizando ticket:",
            error
        );

        console.error(
            "Stack:",
            error.stack
        );

        return res.status(400).json({
            ok: false,

            version:
                "2026-06-08-CALENDAR-V1",

            mensaje:
                error.message ||
                "No fue posible actualizar el ticket."
        });
    } finally {
        await eliminarArchivosTemporales(req);
    }
}

module.exports = {
    postTicket,
    getTickets,
    putTicket
};