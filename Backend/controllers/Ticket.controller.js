const {
    createTicket,
    getAllTickets,
    updateTicket
} = require("../models/Ticket.model");

function getBaseUrl(req) {
    return process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get("host")}`;
}

function construirArchivoAdjunto(req) {
    if (!req.file) {
        return null;
    }

    const baseUrl = getBaseUrl(req);

    return {
        nombre: req.file.originalname,
        nombreGuardado: req.file.filename,
        tipo: req.file.mimetype,
        tamano: req.file.size,
        ruta: req.file.path,
        url: `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`,
        enlace: `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`,
        fechaSubida: new Date().toISOString()
    };
}

async function postTicket(req, res) {
    try {
        console.log("TICKET CONTROLLER VERSION: 2026-06-07-FILES-V1");
        console.log("Content-Type:", req.headers["content-type"]);
        console.log("Datos recibidos:", req.body);
        console.log("Archivo recibido:", req.file);

        const archivoAdjunto = construirArchivoAdjunto(req);

        const datosTicket = {
            usuarioId: req.body?.usuarioId || "",
            usuarioNombre: req.body?.usuarioNombre || "Usuario",
            titulo: req.body?.titulo || "",
            descripcion: req.body?.descripcion || "",
            prioridad: req.body?.prioridad || "media",
            fechaVencimiento: req.body?.fechaVencimiento || null,
            empleadoId: req.body?.empleadoId || "",
            empleadoNombre: req.body?.empleadoNombre || "No asignado",
            clienteId: req.body?.clienteId || "",
            clienteNombre: req.body?.clienteNombre || "No asignado",
            areaId: req.body?.areaId || "",
            areaName: req.body?.areaName || "No asignada",
            archivoAdjunto
        };

        console.log("Objeto enviado al modelo:", datosTicket);

        const ticketCreado = await createTicket(datosTicket);

        return res.status(201).json({
            ok: true,
            version: "2026-06-07-FILES-V1",
            mensaje: "Ticket creado correctamente.",
            ticket: ticketCreado
        });
    } catch (error) {
        console.error("Error creando ticket:", error);
        console.error("Stack:", error.stack);

        return res.status(400).json({
            ok: false,
            version: "2026-06-07-FILES-V1",
            mensaje: error.message || "No fue posible crear el ticket."
        });
    }
}

async function getTickets(req, res) {
    try {
        const tickets = await getAllTickets();

        return res.status(200).json({
            ok: true,
            tickets
        });
    } catch (error) {
        console.error("Error obteniendo tickets:", error);

        return res.status(500).json({
            ok: false,
            mensaje: error.message || "No fue posible obtener los tickets."
        });
    }
}

async function putTicket(req, res) {
    try {
        console.log("PUT TICKET CONTROLLER VERSION: 2026-06-07-FILES-V1");
        console.log("Content-Type:", req.headers["content-type"]);
        console.log("Datos recibidos:", req.body);
        console.log("Archivo recibido:", req.file);

        const { id } = req.params;
        const archivoAdjunto = construirArchivoAdjunto(req);

        const datosTicket = {
            titulo: req.body?.titulo || "",
            descripcion: req.body?.descripcion || "",
            prioridad: req.body?.prioridad || "media",
            estado: req.body?.estado || "abierto",
            fechaVencimiento: req.body?.fechaVencimiento || null,

            empleadoId: req.body?.empleadoId || "",
            empleadoNombre: req.body?.empleadoNombre || "No asignado",

            clienteId: req.body?.clienteId || "",
            clienteNombre: req.body?.clienteNombre || "No asignado",

            areaId: req.body?.areaId || "",
            areaName: req.body?.areaName || "No asignada",

            archivoAdjunto
        };

        const ticketActualizado = await updateTicket(
            id,
            datosTicket
        );

        return res.status(200).json({
            ok: true,
            version: "2026-06-07-FILES-V1",
            mensaje: "Ticket actualizado correctamente.",
            ticket: ticketActualizado
        });
    } catch (error) {
        console.error("Error actualizando ticket:", error);

        return res.status(400).json({
            ok: false,
            version: "2026-06-07-FILES-V1",
            mensaje: error.message || "No fue posible actualizar el ticket."
        });
    }
}

module.exports = {
    postTicket,
    getTickets,
    putTicket
};