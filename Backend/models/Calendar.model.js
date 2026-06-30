const { db } = require("../services/Firebase");

const {
    getEmployeeById
} = require("./Employee.model");

async function getEmployeeCalendarData(empleadoId) {
    const empleado = await getEmployeeById(empleadoId);

    if (!empleado) {
        return null;
    }

    return {
        empleado,
        conectado: empleado.google_calendar?.conectado === true,
        refreshToken: empleado.google_calendar?.refresh_token || "",
        correoGoogle: empleado.google_correo || "",
        nombreGoogle: empleado.google_nombre || ""
    };
}

async function saveEmployeeCalendarTokens(empleadoId, datosCalendar) {
    const empleadoRef = db
        .collection("employees")
        .doc(empleadoId);

    await empleadoRef.set(
        {
            google_id: datosCalendar.googleId || "",
            google_nombre: datosCalendar.nombreGoogle || "",
            google_correo: datosCalendar.correoGoogle || "",
            google_calendar: {
                conectado: true,
                access_token: datosCalendar.accessToken || "",
                refresh_token: datosCalendar.refreshToken || "",
                scope: datosCalendar.scope || "",
                token_type: datosCalendar.tokenType || "",
                expiry_date: datosCalendar.expiryDate || null
            },
            actualizado_en: new Date().toISOString()
        },
        { merge: true }
    );

    return {
        id: empleadoId,
        google_correo: datosCalendar.correoGoogle || "",
        google_calendar_conectado: true
    };
}

module.exports = {
    getEmployeeCalendarData,
    saveEmployeeCalendarTokens
};