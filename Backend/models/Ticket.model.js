const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../services/Firebase");

function validateTicketData(datosTicket) {
    if (!datosTicket || typeof datosTicket !== "object") {
        throw new Error(
            "No se recibieron los datos del ticket."
        );
    }

    if (
        typeof datosTicket.titulo !== "string" ||
        !datosTicket.titulo.trim()
    ) {
        throw new Error(
            "Falta el campo requerido: titulo"
        );
    }
}

async function createTicket(datosTicket) {
    validateTicketData(datosTicket);

    const {
        usuarioId = "",
        usuarioNombre = "Usuario",
        titulo,
        descripcion = "",
        prioridad = "media",
        fechaVencimiento = null,
        empleadoId = "",
        empleadoNombre = "No asignado",
        clienteId = "",
        clienteNombre = "No asignado",
        areaId = "",
        areaName = "No asignada"
    } = datosTicket;

    const contadorRef = db.collection("counters").doc("tickets");
    const ticketRef = db.collection("tickets").doc();

    const resultado = await db.runTransaction(async (transaction) => {
        const contadorSnap = await transaction.get(contadorRef);

        const ultimoNumero = contadorSnap.exists
            ? contadorSnap.data().ultimoNumero || 0
            : 0;

        const numeroTicket = ultimoNumero + 1;

        const ticketNuevo = {
            numeroTicket,
            usuarioId: String(usuarioId || ""),
            usuarioNombre: usuarioNombre || "Usuario",
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            prioridad: String(prioridad || "media").toLowerCase(),
            fechaVencimiento: fechaVencimiento || null,
            expirationDate: fechaVencimiento ? new Date(fechaVencimiento) : null,
            empleadoId: String(empleadoId || ""),
            empleadoNombre: empleadoId ? empleadoNombre : "No asignado",
            clienteId: String(clienteId || ""),
            clienteNombre: clienteId ? clienteNombre : "No asignado",
            areaId: String(areaId || ""),
            areaName: areaId ? areaName : "No asignada",
            estadoTicketId: "1",
            estadoNombre: "Abierto",
            isCompleted: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        transaction.set(ticketRef, ticketNuevo);

        transaction.set(
            contadorRef,
            {
                ultimoNumero: numeroTicket,
                updatedAt: FieldValue.serverTimestamp()
            },
            { merge: true }
        );

        return {
            id: ticketRef.id,
            ...ticketNuevo
        };
    });

    return resultado;
}

async function updateTicket(ticketId, datosTicket) {
    if (!ticketId) {
        throw new Error("Falta el id del ticket.");
    }

    validateTicketData(datosTicket);

    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
        throw new Error("El ticket no existe.");
    }

    const estadoNormalizado = String(datosTicket.estado || "abierto").toLowerCase();
    const isCompleted = estadoNormalizado === "completado";
    const estadoNombre = isCompleted ? "Completado" : "Abierto";
    const estadoTicketId = isCompleted ? "2" : "1";

    const empleadoId = String(datosTicket.empleadoId || "");
    const clienteId = String(datosTicket.clienteId || "");
    const areaId = String(datosTicket.areaId || "");

    const datosActualizar = {
        titulo: datosTicket.titulo.trim(),
        descripcion: (datosTicket.descripcion || "").trim(),
        prioridad: String(datosTicket.prioridad || "media").toLowerCase(),
        fechaVencimiento: datosTicket.fechaVencimiento || null,
        expirationDate: datosTicket.fechaVencimiento ? new Date(datosTicket.fechaVencimiento) : null,

        empleadoId,
        empleadoNombre: empleadoId ? datosTicket.empleadoNombre || "Empleado" : "No asignado",

        clienteId,
        clienteNombre: clienteId ? datosTicket.clienteNombre || "Cliente" : "No asignado",

        areaId,
        areaName: areaId ? datosTicket.areaName || "Área" : "No asignada",

        estadoTicketId,
        estadoNombre,
        isCompleted,
        updatedAt: FieldValue.serverTimestamp()
    };

    await ticketRef.update(datosActualizar);

    const ticketActualizadoSnap = await ticketRef.get();

    return mapTicket(ticketActualizadoSnap.id, ticketActualizadoSnap.data());
}

async function getAllTickets() {
    const snapshot = await db
        .collection("tickets")
        .orderBy("createdAt", "desc")
        .get();

    return snapshot.docs.map((doc) => {
        return mapTicket(doc.id, doc.data());
    });
}

function mapTicket(id, data) {
    return {
        id,
        numeroTicket: data.numeroTicket || "",
        usuarioId: data.usuarioId || data.userCreatorId || "",
        usuarioNombre: data.usuarioNombre || data.snapshots?.usuarioNombre || "Usuario",
        titulo: data.titulo || "",
        descripcion: data.descripcion || "",
        prioridad: data.prioridad || "media",
        fechaVencimiento: data.fechaVencimiento || null,
        expirationDate: data.expirationDate || null,
        empleadoId: data.empleadoId || data.assignedEmployeeId || "",
        empleadoNombre: data.empleadoNombre || data.snapshots?.empleadoNombre || "No asignado",
        clienteId: data.clienteId || "",
        clienteNombre: data.clienteNombre || data.snapshots?.clienteNombre || "No asignado",
        areaId: data.areaId || "",
        areaName: data.areaName || data.snapshots?.areaName || "No asignada",
        estadoTicketId: data.estadoTicketId || "",
        estadoNombre: data.estadoNombre || data.snapshots?.estadoNombre || "Abierto",
        isCompleted: data.isCompleted || false,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
    };
}

module.exports = {
    createTicket,
    getAllTickets,
    updateTicket
};