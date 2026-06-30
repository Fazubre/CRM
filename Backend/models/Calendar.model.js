const { db } = require("../services/Firebase");

const {
    getEmployeeById
} = require("./Employee.model");

async function getEmployeeCalendarData(empleadoId) {
    const empleado = await getEmployeeById(empleadoId);

    if (!empleado) {
        return null;
    }

    const googleCalendar = empleado.google_calendar || {};

    const refreshToken =
        googleCalendar.refresh_token ||
        empleado.google_refresh_token ||
        "";

    const conectado =
        googleCalendar.conectado === true ||
        empleado.calendar_habilitado === true ||
        Boolean(refreshToken);

    return {
        empleado,
        conectado,
        refreshToken,
        correoGoogle: empleado.google_correo || empleado.correo || "",
        nombreGoogle: empleado.google_nombre || empleado.nombre || ""
    };
}

async function saveEmployeeCalendarTokens(empleadoId, datosCalendar) {
    const empleadoRef = db
        .collection("employees")
        .doc(empleadoId);

    const ahora = new Date().toISOString();

    await empleadoRef.set(
        {
            google_id: datosCalendar.googleId || "",
            google_nombre: datosCalendar.nombreGoogle || "",
            google_correo: datosCalendar.correoGoogle || "",

            calendar_habilitado: true,
            google_refresh_token: datosCalendar.refreshToken || null,
            google_calendar_conectado: true,

            google_calendar: {
                conectado: true,
                access_token: datosCalendar.accessToken || "",
                refresh_token: datosCalendar.refreshToken || "",
                scope: datosCalendar.scope || "",
                token_type: datosCalendar.tokenType || "",
                expiry_date: datosCalendar.expiryDate || null
            },

            fecha_actualizacion: ahora,
            actualizado_en: ahora
        },
        { merge: true }
    );

    return {
        id: empleadoId,
        google_correo: datosCalendar.correoGoogle || "",
        google_calendar_conectado: true,
        calendar_habilitado: true
    };
}

module.exports = {
    getEmployeeCalendarData,
    saveEmployeeCalendarTokens
};