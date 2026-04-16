const {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient
} = require("../models/Client.model");

async function postClient(req, res) {
    try {
        const clienteNuevo = await createClient(req.body);

        return res.status(201).json({
            ok: true,
            mensaje: "Cliente creado correctamente.",
            cliente: clienteNuevo
        });
    } catch (error) {
        console.error("Error al crear cliente:", error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message || "No fue posible crear el cliente."
        });
    }
}

async function getClients(req, res) {
    try {
        const clientes = await getAllClients();

        return res.status(200).json({
            ok: true,
            clientes
        });
    } catch (error) {
        console.error("Error al obtener clientes:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible obtener los clientes."
        });
    }
}

async function getClient(req, res) {
    try {
        const { id } = req.params;
        const cliente = await getClientById(id);

        return res.status(200).json({
            ok: true,
            cliente
        });
    } catch (error) {
        console.error("Error al obtener cliente:", error);

        const status = error.message === "El cliente no existe." ? 404 : 500;

        return res.status(status).json({
            ok: false,
            mensaje: error.message || "No fue posible obtener el cliente."
        });
    }
}

async function putClient(req, res) {
    try {
        const { id } = req.params;
        const clienteActualizado = await updateClient(id, req.body);

        return res.status(200).json({
            ok: true,
            mensaje: "Cliente actualizado correctamente.",
            cliente: clienteActualizado
        });
    } catch (error) {
        console.error("Error al actualizar cliente:", error);

        let status = 400;

        if (error.message === "El cliente no existe.") {
            status = 404;
        }

        return res.status(status).json({
            ok: false,
            mensaje: error.message || "No fue posible actualizar el cliente."
        });
    }
}

async function removeClient(req, res) {
    try {
        const { id } = req.params;
        const resultado = await deleteClient(id);

        return res.status(200).json({
            ok: true,
            mensaje: "Cliente eliminado correctamente.",
            resultado
        });
    } catch (error) {
        console.error("Error al eliminar cliente:", error);

        const status = error.message === "El cliente no existe." ? 404 : 500;

        return res.status(status).json({
            ok: false,
            mensaje: error.message || "No fue posible eliminar el cliente."
        });
    }
}

module.exports = {
    postClient,
    getClients,
    getClient,
    putClient,
    removeClient
};