const { db } = require("../services/Firebase");

const coleccionEmployees = db.collection("employees");

function sanitizeEmployeeData(datos = {}, esActualizacion = false) {
    const employeeSanitizado = {};

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "google_id")) {
        employeeSanitizado.google_id = String(datos.google_id || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "nombre")) {
        employeeSanitizado.nombre = String(datos.nombre || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "correo")) {
        employeeSanitizado.correo = String(datos.correo || "").trim().toLowerCase();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "foto_url")) {
        employeeSanitizado.foto_url = String(datos.foto_url || "").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "correo_verificado")) {
        employeeSanitizado.correo_verificado = Boolean(datos.correo_verificado);
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "rol")) {
        employeeSanitizado.rol = String(datos.rol || "employee").trim().toLowerCase();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "activo")) {
        employeeSanitizado.activo =
            typeof datos.activo === "boolean" ? datos.activo : true;
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "calendar_habilitado")) {
        employeeSanitizado.calendar_habilitado =
            typeof datos.calendar_habilitado === "boolean"
                ? datos.calendar_habilitado
                : false;
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "calendar_id")) {
        employeeSanitizado.calendar_id = String(datos.calendar_id || "primary").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "timezone")) {
        employeeSanitizado.timezone = String(datos.timezone || "America/Costa_Rica").trim();
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "google_refresh_token")) {
        employeeSanitizado.google_refresh_token = datos.google_refresh_token
            ? String(datos.google_refresh_token).trim()
            : null;
    }

    return employeeSanitizado;
}

function validateEmployeeData(datos = {}, esActualizacion = false) {
    const errores = [];
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "google_id")) {
        if (!datos.google_id || !String(datos.google_id).trim()) {
            errores.push("El google_id del employee es obligatorio.");
        }
    }

    if (!esActualizacion || Object.prototype.hasOwnProperty.call(datos, "correo")) {
        if (!datos.correo || !String(datos.correo).trim()) {
            errores.push("El correo del employee es obligatorio.");
        } else if (!correoRegex.test(String(datos.correo).trim().toLowerCase())) {
            errores.push("El correo del employee no tiene un formato válido.");
        }
    }

    return errores;
}

async function googleIdExists(googleId, employeeIdExcluir = null) {
    const snapshot = await coleccionEmployees
        .where("google_id", "==", googleId)
        .limit(10)
        .get();

    if (snapshot.empty) {
        return false;
    }

    if (!employeeIdExcluir) {
        return true;
    }

    return snapshot.docs.some((doc) => doc.id !== employeeIdExcluir);
}

async function emailExists(correo, employeeIdExcluir = null) {
    const snapshot = await coleccionEmployees
        .where("correo", "==", correo)
        .limit(10)
        .get();

    if (snapshot.empty) {
        return false;
    }

    if (!employeeIdExcluir) {
        return true;
    }

    return snapshot.docs.some((doc) => doc.id !== employeeIdExcluir);
}

async function createEmployee(datos) {
    const employeeSanitizado = sanitizeEmployeeData(datos);
    const errores = validateEmployeeData(employeeSanitizado);

    if (errores.length > 0) {
        throw new Error(errores.join(" "));
    }

    const googleDuplicado = await googleIdExists(employeeSanitizado.google_id);
    if (googleDuplicado) {
        throw new Error("Ya existe un employee registrado con ese google_id.");
    }

    const correoDuplicado = await emailExists(employeeSanitizado.correo);
    if (correoDuplicado) {
        throw new Error("Ya existe un employee registrado con ese correo.");
    }

    const referencia = coleccionEmployees.doc();
    const ahora = new Date().toISOString();

    const employeeNuevo = {
        employee_id: referencia.id,
        google_id: employeeSanitizado.google_id,
        nombre: employeeSanitizado.nombre || employeeSanitizado.correo,
        correo: employeeSanitizado.correo,
        foto_url: employeeSanitizado.foto_url,
        correo_verificado: employeeSanitizado.correo_verificado,
        rol: employeeSanitizado.rol || "employee",
        activo: typeof employeeSanitizado.activo === "boolean" ? employeeSanitizado.activo : true,

        calendar_habilitado:
            typeof employeeSanitizado.calendar_habilitado === "boolean"
                ? employeeSanitizado.calendar_habilitado
                : false,

        calendar_id: employeeSanitizado.calendar_id || "primary",
        timezone: employeeSanitizado.timezone || "America/Costa_Rica",
        google_refresh_token: employeeSanitizado.google_refresh_token || null,

        fecha_creacion: ahora,
        fecha_actualizacion: ahora,
        ultimo_login: ahora
    };

    await referencia.set(employeeNuevo);

    return employeeNuevo;
}

async function getAllEmployees() {
    const snapshot = await coleccionEmployees
        .orderBy("fecha_creacion", "desc")
        .get();

    return snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
            id: doc.id,
            ...data
        };
    });
}

async function getEmployeeById(employeeId) {
    const referencia = coleccionEmployees.doc(employeeId);
    const documento = await referencia.get();

    if (!documento.exists) {
        throw new Error("El employee no existe.");
    }

    return {
        id: documento.id,
        ...documento.data()
    };
}
async function getEmployeeByGoogleId(googleId) {
    const snapshot = await coleccionEmployees
        .where("google_id", "==", String(googleId).trim())
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];

    return {
        id: doc.id,
        ...doc.data()
    };
}

async function getEmployeeByEmail(correo) {
    const snapshot = await coleccionEmployees
        .where("correo", "==", String(correo).trim().toLowerCase())
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];

    return {
        id: doc.id,
        ...doc.data()
    };
}

async function syncEmployeeFromGoogle(datosGoogle) {
    const google_id = String(datosGoogle.google_id || "").trim();
    const correo = String(datosGoogle.correo || "").trim().toLowerCase();

    if (!google_id) {
        throw new Error("No se recibió el google_id del usuario.");
    }

    if (!correo) {
        throw new Error("No se recibió el correo del usuario.");
    }

    const existente = await getEmployeeByGoogleId(google_id);

    if (existente) {
        const referencia = coleccionEmployees.doc(existente.employee_id);

        const datosActualizados = {
            nombre: String(datosGoogle.nombre || existente.nombre || correo).trim(),
            correo,
            foto_url: String(datosGoogle.foto_url || existente.foto_url || "").trim(),
            correo_verificado: Boolean(datosGoogle.correo_verificado),
            fecha_actualizacion: new Date().toISOString(),
            ultimo_login: new Date().toISOString()
        };

        await referencia.update(datosActualizados);

        const documentoActualizado = await referencia.get();
        return documentoActualizado.data();
    }

    return await createEmployee({
        google_id,
        nombre: datosGoogle.nombre || correo,
        correo,
        foto_url: datosGoogle.foto_url || "",
        correo_verificado: datosGoogle.correo_verificado || false,
        rol: "employee",
        activo: true,
        calendar_habilitado: false,
        calendar_id: "primary",
        timezone: "America/Costa_Rica",
        google_refresh_token: null
    });
}

async function updateEmployee(employeeId, datos) {
    const referencia = coleccionEmployees.doc(employeeId);
    const documento = await referencia.get();

    if (!documento.exists) {
        throw new Error("El employee no existe.");
    }

    const employeeActual = documento.data();
    const employeeSanitizado = sanitizeEmployeeData(datos, true);
    const errores = validateEmployeeData(employeeSanitizado, true);

    if (errores.length > 0) {
        throw new Error(errores.join(" "));
    }

    if (employeeSanitizado.google_id) {
        const googleDuplicado = await googleIdExists(employeeSanitizado.google_id, employeeId);

        if (googleDuplicado) {
            throw new Error("Ya existe otro employee registrado con ese google_id.");
        }
    }

    if (employeeSanitizado.correo) {
        const correoDuplicado = await emailExists(employeeSanitizado.correo, employeeId);

        if (correoDuplicado) {
            throw new Error("Ya existe otro employee registrado con ese correo.");
        }
    }

    const datosActualizados = {
        ...employeeSanitizado,
        fecha_actualizacion: new Date().toISOString()
    };

    if (
        Object.prototype.hasOwnProperty.call(datosActualizados, "nombre") &&
        !datosActualizados.nombre
    ) {
        datosActualizados.nombre = employeeActual.correo;
    }

    await referencia.update(datosActualizados);

    const documentoActualizado = await referencia.get();
    return documentoActualizado.data();
}

async function changeEmployeeStatus(employeeId, activo) {
    const referencia = coleccionEmployees.doc(employeeId);
    const documento = await referencia.get();

    if (!documento.exists) {
        throw new Error("El employee no existe.");
    }

    await referencia.update({
        activo: Boolean(activo),
        fecha_actualizacion: new Date().toISOString()
    });

    const documentoActualizado = await referencia.get();
    return documentoActualizado.data();
}

module.exports = {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    getEmployeeByGoogleId,
    getEmployeeByEmail,
    syncEmployeeFromGoogle,
    updateEmployee,
    changeEmployeeStatus
};