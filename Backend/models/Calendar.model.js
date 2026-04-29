const { db } = require("../services/Firebase");

async function getEmployeeById(empleadoId) {
    const empleadoDoc = await db.collection("employees").doc(empleadoId).get();

    if (!empleadoDoc.exists) {
        return null;
    }

    return {
        id: empleadoDoc.id,
        ...empleadoDoc.data()
    };
}

async function saveEmployeeCalendarTokens(empleadoId, datosCalendar) {
    const empleadoRef = db.collection("employees").doc(empleadoId);

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
    getEmployeeById,
    saveEmployeeCalendarTokens
};