const { db } = require("../services/Firebase");

const coleccionClientes = db.collection("clientes");

function sanitizeClientData(datos = {}, esActualizacion = false) {
    const clienteSanitizado = {};

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "nombre")) {
        clienteSanitizado.nombre = String(datos.nombre || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "correo")) {
        clienteSanitizado.correo = String(datos.correo || "").trim().toLowerCase();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "telefono")) {
        clienteSanitizado.telefono = String(datos.telefono || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "empresa")) {
        clienteSanitizado.empresa = String(datos.empresa || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "identificacion")) {
        clienteSanitizado.identificacion = String(datos.identificacion || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "direccion")) {
        clienteSanitizado.direccion = String(datos.direccion || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "estado")) {
        clienteSanitizado.estado = String(datos.estado || "activo").trim().toLowerCase();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "notas")) {
        clienteSanitizado.notas = String(datos.notas || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "creado_por")) {
        clienteSanitizado.creado_por = String(datos.creado_por || "").trim();
    }

    return clienteSanitizado;
}

function validateClientData(datos = {}, esActualizacion = false) {
    const errores = [];
    const estadosValidos = ["activo", "inactivo", "prospecto"];
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "nombre")) {
        if (!datos.nombre || !String(datos.nombre).trim()) {
            errores.push("El nombre del cliente es obligatorio.");
        }
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "correo")) {
        if (!datos.correo || !String(datos.correo).trim()) {
            errores.push("El correo del cliente es obligatorio.");
        } else if (!correoRegex.test(String(datos.correo).trim().toLowerCase())) {
            errores.push("El correo del cliente no tiene un formato válido.");
        }
    }

    if (Object.prototype.hasOwnProperty.call(datos, "estado")) {
        const estado = String(datos.estado || "").trim().toLowerCase();

        if (estado && !estadosValidos.includes(estado)) {
            errores.push("El estado del cliente no es válido.");
        }
    }

    return errores;
}

async function emailExists(correo, clienteIdExcluir = null) {
    const snapshot = await coleccionClientes
        .where("correo", "==", correo)
        .limit(10)
        .get();

    if (snapshot.empty) {
        return false;
    }

    if (!clienteIdExcluir) {
        return true;
    }

    return snapshot.docs.some((doc) => doc.id !== clienteIdExcluir);
}

async function createClient(datos) {
    const clienteSanitizado = sanitizeClientData(datos);
    const errores = validateClientData(clienteSanitizado);

    if (errores.length > 0) {
        throw new Error(errores.join(" "));
    }

    const correoDuplicado = await emailExists(clienteSanitizado.correo);

    if (correoDuplicado) {
        throw new Error("Ya existe un cliente registrado con ese correo.");
    }

    const referencia = coleccionClientes.doc();
    const ahora = new Date().toISOString();

    const clienteNuevo = {
        cliente_id: referencia.id,
        nombre: clienteSanitizado.nombre,
        correo: clienteSanitizado.correo,
        telefono: clienteSanitizado.telefono,
        empresa: clienteSanitizado.empresa,
        identificacion: clienteSanitizado.identificacion,
        direccion: clienteSanitizado.direccion,
        estado: clienteSanitizado.estado || "activo",
        notas: clienteSanitizado.notas,
        creado_por: clienteSanitizado.creado_por,
        fecha_creacion: ahora,
        fecha_actualizacion: ahora
    };

    await referencia.set(clienteNuevo);

    return clienteNuevo;
}

async function getAllClients() {
    const snapshot = await coleccionClientes
        .orderBy("fecha_creacion", "desc")
        .get();

    return snapshot.docs.map((doc) => doc.data());
}

async function getClientById(clienteId) {
    const referencia = coleccionClientes.doc(clienteId);
    const documento = await referencia.get();

    if (!documento.exists) {
        throw new Error("El cliente no existe.");
    }

    return documento.data();
}

async function updateClient(clienteId, datos) {
    const referencia = coleccionClientes.doc(clienteId);
    const documento = await referencia.get();

    if (!documento.exists) {
        throw new Error("El cliente no existe.");
    }

    const clienteSanitizado = sanitizeClientData(datos, true);
    const errores = validateClientData(clienteSanitizado, true);

    if (errores.length > 0) {
        throw new Error(errores.join(" "));
    }

    if (clienteSanitizado.correo) {
        const correoDuplicado = await emailExists(clienteSanitizado.correo, clienteId);

        if (correoDuplicado) {
            throw new Error("Ya existe otro cliente registrado con ese correo.");
        }
    }

    const datosActualizados = {
        ...clienteSanitizado,
        fecha_actualizacion: new Date().toISOString()
    };

    await referencia.update(datosActualizados);

    const documentoActualizado = await referencia.get();
    return documentoActualizado.data();
}

async function deleteClient(clienteId) {
    const referencia = coleccionClientes.doc(clienteId);
    const documento = await referencia.get();

    if (!documento.exists) {
        throw new Error("El cliente no existe.");
    }

    await referencia.delete();

    return {
        cliente_id: clienteId,
        eliminado: true
    };
}

module.exports = {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient
};