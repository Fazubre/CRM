const { google } = require("googleapis");

const {
    getEmployeeById,
    saveEmployeeCalendarTokens
} = require("../models/Calendar.model");

const {
    generarUrlGoogleCalendar,
    obtenerTokensDesdeCodigo
} = require("../services/GoogleCalendar");

async function conectarCalendar(req, res) {
    try {
        const { empleadoId } = req.query;

        if (!empleadoId) {
            return res.redirect(
                `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent("No se recibió el ID del empleado.")}`
            );
        }

        const empleado = await getEmployeeById(empleadoId);

        if (!empleado) {
            return res.redirect(
                `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent("El empleado no existe en Firestore.")}`
            );
        }

        const url = generarUrlGoogleCalendar(empleadoId);
        return res.redirect(url);
    } catch (error) {
        console.error("Error al conectar Google Calendar:", error);

        return res.redirect(
            `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent("No fue posible iniciar la conexión con Google Calendar.")}`
        );
    }
}

async function callbackCalendar(req, res) {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.redirect(
                `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent("No se recibió el código de autorización de Google.")}`
            );
        }

        if (!state) {
            return res.redirect(
                `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent("No se recibió el ID del empleado.")}`
            );
        }

        const empleadoId = state;

        const empleado = await getEmployeeById(empleadoId);

        if (!empleado) {
            return res.redirect(
                `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent("El empleado no existe en Firestore.")}`
            );
        }

        const tokens = await obtenerTokensDesdeCodigo(code);

        if (!tokens.refresh_token) {
            return res.redirect(
                `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent("No se recibió refresh_token. Revoca el acceso de la app en Google y vuelve a conectar.")}`
            );
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: "v2"
        });

        const perfil = await oauth2.userinfo.get();

        const datosCalendar = {
            googleId: perfil.data.id || "",
            nombreGoogle: perfil.data.name || "",
            correoGoogle: perfil.data.email || "",
            accessToken: tokens.access_token || "",
            refreshToken: tokens.refresh_token || "",
            scope: tokens.scope || "",
            tokenType: tokens.token_type || "",
            expiryDate: tokens.expiry_date || null
        };

        await saveEmployeeCalendarTokens(empleadoId, datosCalendar);

        return res.redirect(
            `/Views/Calendar.html?estado=ok&empleadoId=${encodeURIComponent(empleadoId)}&correo=${encodeURIComponent(datosCalendar.correoGoogle)}`
        );
    } catch (error) {
        console.error("Error en callback de Google Calendar:", error);

        return res.redirect(
            `/Views/Calendar.html?estado=error&mensaje=${encodeURIComponent(error.message || "No fue posible conectar Google Calendar.")}`
        );
    }
}

module.exports = {
    conectarCalendar,
    callbackCalendar
};