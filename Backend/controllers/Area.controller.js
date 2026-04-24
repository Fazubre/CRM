const {
    getAllAreas,
    getAreaById,
    createArea,
    updateArea,
    deactivateArea
} = require("../models/Area.model");

async function getAreas(req, res) {
    try {
        const areas = await getAllAreas();

        return res.status(200).json({
            ok: true,
            areas
        });
    } catch (error) {
        console.error("Error obteniendo áreas:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible obtener las áreas."
        });
    }
}

async function getArea(req, res) {
    try {
        const area = await getAreaById(req.params.id);

        return res.status(200).json({
            ok: true,
            area
        });
    } catch (error) {
        console.error("Error obteniendo área:", error);

        return res.status(404).json({
            ok: false,
            mensaje: error.message || "No fue posible obtener el área."
        });
    }
}

async function postArea(req, res) {
    try {
        const areaNueva = await createArea(req.body);

        return res.status(201).json({
            ok: true,
            mensaje: "Área creada correctamente.",
            area: areaNueva
        });
    } catch (error) {
        console.error("Error creando área:", error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message || "No fue posible crear el área."
        });
    }
}

async function putArea(req, res) {
    try {
        const areaActualizada = await updateArea(req.params.id, req.body);

        return res.status(200).json({
            ok: true,
            mensaje: "Área actualizada correctamente.",
            area: areaActualizada
        });
    } catch (error) {
        console.error("Error actualizando área:", error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message || "No fue posible actualizar el área."
        });
    }
}

async function deleteArea(req, res) {
    try {
        const areaDesactivada = await deactivateArea(req.params.id);

        return res.status(200).json({
            ok: true,
            mensaje: "Área desactivada correctamente.",
            area: areaDesactivada
        });
    } catch (error) {
        console.error("Error desactivando área:", error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message || "No fue posible desactivar el área."
        });
    }
}

module.exports = {
    getAreas,
    getArea,
    postArea,
    putArea,
    deleteArea
};