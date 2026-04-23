const {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    getEmployeeByGoogleId,
    getEmployeeByEmail,
    updateEmployee,
    changeEmployeeStatus
} = require("../models/Employee.model");

async function postEmployee(req, res) {
    try {
        const employeeNuevo = await createEmployee(req.body);

        return res.status(201).json({
            ok: true,
            mensaje: "Employee creado correctamente.",
            employee: employeeNuevo
        });
    } catch (error) {
        console.error("Error al crear employee:", error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message || "No fue posible crear el employee."
        });
    }
}

async function getEmployees(req, res) {
    try {
        const employees = await getAllEmployees();

        return res.status(200).json({
            ok: true,
            employees
        });
    } catch (error) {
        console.error("Error al obtener employees:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible obtener los employees."
        });
    }
}

async function getEmployee(req, res) {
    try {
        const { employeeId } = req.params;
        const employee = await getEmployeeById(employeeId);

        return res.status(200).json({
            ok: true,
            employee
        });
    } catch (error) {
        console.error("Error al obtener employee por ID:", error);

        const status = error.message === "El employee no existe." ? 404 : 500;

        return res.status(status).json({
            ok: false,
            mensaje: error.message || "No fue posible obtener el employee."
        });
    }
}

async function getEmployeeByGoogle(req, res) {
    try {
        const { googleId } = req.params;
        const employee = await getEmployeeByGoogleId(googleId);

        if (!employee) {
            return res.status(404).json({
                ok: false,
                mensaje: "No se encontró un employee con ese google_id."
            });
        }

        return res.status(200).json({
            ok: true,
            employee
        });
    } catch (error) {
        console.error("Error al obtener employee por google_id:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible obtener el employee por google_id."
        });
    }
}

async function getEmployeeByCorreo(req, res) {
    try {
        const { correo } = req.query;

        if (!correo) {
            return res.status(400).json({
                ok: false,
                mensaje: "El parámetro correo es obligatorio."
            });
        }

        const employee = await getEmployeeByEmail(correo);

        if (!employee) {
            return res.status(404).json({
                ok: false,
                mensaje: "No se encontró un employee con ese correo."
            });
        }

        return res.status(200).json({
            ok: true,
            employee
        });
    } catch (error) {
        console.error("Error al obtener employee por correo:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible obtener el employee por correo."
        });
    }
}

async function putEmployee(req, res) {
    try {
        const { employeeId } = req.params;
        const employeeActualizado = await updateEmployee(employeeId, req.body);

        return res.status(200).json({
            ok: true,
            mensaje: "Employee actualizado correctamente.",
            employee: employeeActualizado
        });
    } catch (error) {
        console.error("Error al actualizar employee:", error);

        const status = error.message === "El employee no existe." ? 404 : 400;

        return res.status(status).json({
            ok: false,
            mensaje: error.message || "No fue posible actualizar el employee."
        });
    }
}

async function patchEmployeeStatus(req, res) {
    try {
        const { employeeId } = req.params;
        const { activo } = req.body;

        if (typeof activo !== "boolean") {
            return res.status(400).json({
                ok: false,
                mensaje: "El campo activo debe ser boolean."
            });
        }

        const employeeActualizado = await changeEmployeeStatus(employeeId, activo);

        return res.status(200).json({
            ok: true,
            mensaje: "Estado del employee actualizado correctamente.",
            employee: employeeActualizado
        });
    } catch (error) {
        console.error("Error al cambiar estado del employee:", error);

        const status = error.message === "El employee no existe." ? 404 : 400;

        return res.status(status).json({
            ok: false,
            mensaje: error.message || "No fue posible actualizar el estado del employee."
        });
    }
}

module.exports = {
    postEmployee,
    getEmployees,
    getEmployee,
    getEmployeeByGoogle,
    getEmployeeByCorreo,
    putEmployee,
    patchEmployeeStatus
};