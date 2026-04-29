const { createTicket, getAllTickets, updateTicket } = require("../models/Ticket.model");
const { db } = require("../services/Firebase");
const { crearEventoTicket } = require("../services/GoogleCalendar");

async function intentarCrearEventoCalendar(ticket) {
    try {
        if (!ticket.empleadoId || !ticket.fechaVencimiento) {
            return {
                creado: false,
                mensaje: "El ticket no tiene empleado o fecha de vencimiento."
            };
        }

        const empleadoDoc = await db
            .collection("employees")
            .doc(ticket.empleadoId)
            .get();

        if (!empleadoDoc.exists) {
            return {
                creado: false,
                mensaje: "El empleado no existe en Firestore."
            };
        }

        const empleado = empleadoDoc.data();

        if (
            !empleado.google_calendar ||
            !empleado.google_calendar.conectado ||
            !empleado.google_calendar.refresh_token
        ) {
            return {
                creado: false,
                mensaje: "El empleado no tiene Google Calendar conectado."
            };
        }

        const evento = await crearEventoTicket({
            refreshToken: empleado.google_calendar.refresh_token,
            titulo: ticket.titulo,
            descripcion: ticket.descripcion,
            fechaVencimiento: ticket.fechaVencimiento,
            correoEmpleado: empleado.google_correo || empleado.correo
        });

        await db.collection("tickets").doc(ticket.id).update({
            google_calendar_event_id: evento.id,
            google_calendar_link: evento.htmlLink || "",
            google_calendar_creado: true,
            google_calendar_error: ""
        });

        return {
            creado: true,
            evento
        };
    } catch (error) {
        console.error("Error al crear evento en Google Calendar:", error);

        if (ticket.id) {
            await db.collection("tickets").doc(ticket.id).update({
                google_calendar_creado: false,
                google_calendar_error: error.message || "Error desconocido en Google Calendar."
            });
        }

        return {
            creado: false,
            mensaje: error.message
        };
    }
}

async function postTicket(req, res) {
    try {
        const ticketNuevo = await createTicket(req.body);

        const resultadoCalendar = await intentarCrearEventoCalendar(ticketNuevo);

        return res.status(201).json({
            ok: true,
            mensaje: "Ticket creado correctamente.",
            ticket: {
                ...ticketNuevo,
                google_calendar_creado: resultadoCalendar.creado,
                google_calendar_mensaje: resultadoCalendar.mensaje || ""
            }
        });
    } catch (error) {
        console.error("Error al crear ticket:", error);

        return res.status(400).json({
            ok: false,
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
        console.error("Error al obtener tickets:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible obtener los tickets."
        });
    }
}

async function putTicket(req, res) {
    try {
        const ticketActualizado = await updateTicket(req.params.id, req.body);

        return res.status(200).json({
            ok: true,
            mensaje: "Ticket actualizado correctamente.",
            ticket: ticketActualizado
        });
    } catch (error) {
        console.error("Error al actualizar ticket:", error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message || "No fue posible actualizar el ticket."
        });
    }
}

module.exports = {
    postTicket,
    getTickets,
    putTicket
};