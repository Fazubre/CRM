const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../services/Firebase");

function validateTicketData(datosTicket) {
    if (!datosTicket.titulo || !datosTicket.titulo.trim()) {
        throw new Error("Falta el campo requerido: titulo");
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
        fechaVencimiento = null
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
            userCreatorId: String(usuarioId || ""),
            areaId: "",
            estadoTicketId: "1",
            creationTime: FieldValue.serverTimestamp(),
            expirationDate: fechaVencimiento ? new Date(fechaVencimiento) : null,
            isCompleted: false,
            clienteId: "",
            empresaId: "",
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            prioridad: String(prioridad || "media").toLowerCase(),
            snapshots: {
                usuarioNombre: usuarioNombre || "Usuario",
                areaName: "No asignada",
                clienteNombre: "No asignado",
                empresaNombre: "No asignada",
                estadoNombre: "Abierto"
            },
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

    if (!datosTicket.titulo || !datosTicket.titulo.trim()) {
        throw new Error("Falta el campo requerido: titulo");
    }

    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
        throw new Error("El ticket no existe.");
    }

    const estadoNormalizado = String(datosTicket.estado || "abierto").toLowerCase();
    const isCompleted = estadoNormalizado === "completado";
    const estadoNombre = isCompleted ? "Completado" : "Abierto";
    const estadoTicketId = isCompleted ? "2" : "1";

    const datosActualizar = {
        titulo: datosTicket.titulo.trim(),
        descripcion: (datosTicket.descripcion || "").trim(),
        prioridad: String(datosTicket.prioridad || "media").toLowerCase(),
        expirationDate: datosTicket.fechaVencimiento ? new Date(datosTicket.fechaVencimiento) : null,
        estadoTicketId,
        isCompleted,
        "snapshots.estadoNombre": estadoNombre,
        updatedAt: FieldValue.serverTimestamp()
    };

    await ticketRef.update(datosActualizar);

    const ticketActualizadoSnap = await ticketRef.get();
    const data = ticketActualizadoSnap.data();

    return {
        id: ticketActualizadoSnap.id,
        numeroTicket: data.numeroTicket || "",
        titulo: data.titulo || "",
        descripcion: data.descripcion || "",
        prioridad: data.prioridad || "media",
        estadoTicketId: data.estadoTicketId || "",
        estadoNombre: data.snapshots?.estadoNombre || "",
        clienteNombre: data.snapshots?.clienteNombre || "",
        empresaNombre: data.snapshots?.empresaNombre || "",
        areaName: data.snapshots?.areaName || "",
        usuarioNombre: data.snapshots?.usuarioNombre || "",
        isCompleted: data.isCompleted || false,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
        expirationDate: data.expirationDate || null
    };
}

async function getAllTickets() {
    const snapshot = await db
        .collection("tickets")
        .orderBy("createdAt", "desc")
        .get();

    return snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
            id: doc.id,
            numeroTicket: data.numeroTicket || "",
            titulo: data.titulo || "",
            descripcion: data.descripcion || "",
            prioridad: data.prioridad || "media",
            estadoTicketId: data.estadoTicketId || "",
            estadoNombre: data.snapshots?.estadoNombre || "",
            clienteNombre: data.snapshots?.clienteNombre || "",
            empresaNombre: data.snapshots?.empresaNombre || "",
            areaName: data.snapshots?.areaName || "",
            usuarioNombre: data.snapshots?.usuarioNombre || "",
            isCompleted: data.isCompleted || false,
            createdAt: data.createdAt || null,
            expirationDate: data.expirationDate || null,
            updatedAt: data.updatedAt || null
        };
    });
}

module.exports = {
    createTicket,
    getAllTickets,
    updateTicket
};
