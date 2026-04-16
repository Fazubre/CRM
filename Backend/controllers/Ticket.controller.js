const { createTicket, getAllTickets, updateTicket } = require("../models/Ticket.model");

async function postTicket(req, res) {
    try {
        const ticketNuevo = await createTicket(req.body);

        return res.status(201).json({
            ok: true,
            mensaje: "Ticket creado correctamente.",
            ticket: ticketNuevo
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