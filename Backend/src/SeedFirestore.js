const { db } = require("../services/Firebase");

async function seedFirestore() {
    const batch = db.batch();

    const tiposContacto = [
        { id: "1", nombreContacto: "Email" },
        { id: "2", nombreContacto: "WhatsApp" },
        { id: "3", nombreContacto: "Telegram" }
    ];

    const tiposEmpresa = [
        { id: "1", tipoEmpresa: "Cliente" },
        { id: "2", tipoEmpresa: "Proveedor" }
    ];

    const empresas = [
        {
            id: "1",
            tipoEmpresaId: "1",
            nombreEmpresa: "CRM Voyager",
            correo: "info@crmvoyager.com",
            direccion: "San José",
            fechaCreacion: "2026-03-23"
        }
    ];

    const areas = [
        { id: "1", areaName: "Soporte" },
        { id: "2", areaName: "Ventas" },
        { id: "3", areaName: "Administración" }
    ];

    const estadosTicket = [
        { id: "1", nombreEstado: "Abierto" },
        { id: "2", nombreEstado: "En Proceso" },
        { id: "3", nombreEstado: "Completo" },
        { id: "4", nombreEstado: "Cerrado" }
    ];

    const usuarios = [
        {
            id: "1",
            tipoContactoId: "1",
            email: "fabian@email.com",
            password: "",
            nombreCompleto: "Fabian Zuñiga",
            canCreateUser: true,
            canCreateTicket: true,
            canViewPastTickets: true,
            empresaAsignada: "1"
        }
    ];

    const clientes = [
        {
            id: "1",
            nombre: "Cliente Demo",
            email: "cliente@email.com",
            puesto: "Gerente",
            telefono: "8888-8888",
            empresaId: "1",
            empresaTipoEmpresaId: "1",
            tipoContactoId: "1"
        }
    ];

    for (const item of tiposContacto) {
        batch.set(db.collection("tipo_contacto").doc(item.id), {
            nombreContacto: item.nombreContacto
        });
    }

    for (const item of tiposEmpresa) {
        batch.set(db.collection("tipo_empresa").doc(item.id), {
            tipoEmpresa: item.tipoEmpresa
        });
    }

    for (const item of empresas) {
        batch.set(db.collection("empresas").doc(item.id), {
            tipoEmpresaId: item.tipoEmpresaId,
            nombreEmpresa: item.nombreEmpresa,
            correo: item.correo,
            direccion: item.direccion,
            fechaCreacion: item.fechaCreacion
        });
    }

    for (const item of areas) {
        batch.set(db.collection("areas").doc(item.id), {
            areaName: item.areaName
        });
    }

    for (const item of estadosTicket) {
        batch.set(db.collection("estados_ticket").doc(item.id), {
            nombreEstado: item.nombreEstado
        });
    }

    for (const item of usuarios) {
        batch.set(db.collection("usuarios").doc(item.id), {
            tipoContactoId: item.tipoContactoId,
            email: item.email,
            password: item.password,
            nombreCompleto: item.nombreCompleto,
            canCreateUser: item.canCreateUser,
            canCreateTicket: item.canCreateTicket,
            canViewPastTickets: item.canViewPastTickets,
            empresaAsignada: item.empresaAsignada
        });
    }

    for (const item of clientes) {
        batch.set(db.collection("clientes").doc(item.id), {
            nombre: item.nombre,
            email: item.email,
            puesto: item.puesto,
            telefono: item.telefono,
            empresaId: item.empresaId,
            empresaTipoEmpresaId: item.empresaTipoEmpresaId,
            tipoContactoId: item.tipoContactoId
        });
    }

    batch.set(db.collection("counters").doc("tickets"), {
        ultimoNumero: 0
    });

    await batch.commit();

    console.log("Seed completado correctamente.");
}

seedFirestore()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error al sembrar Firestore:", error);
        process.exit(1);
    });