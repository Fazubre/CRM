const { google } = require("googleapis");

const {
    getEmployeeById,
    saveEmployeeCalendarTokens
} = require("../models/Calendar.model");

const {
    generarUrlGoogleCalendar,
    obtenerTokensDesdeCodigo
} = require("../services/GoogleCalendar");

function construirRedirectError(mensaje, empleadoId = "", correo = "") {
    const params = new URLSearchParams();

    params.set("estado", "error");
    params.set("mensaje", mensaje || "No fue posible conectar Google Calendar.");

    if (empleadoId) {
        params.set("empleadoId", empleadoId);
    }

    if (correo) {
        params.set("correo", correo);
    }

    return `/Views/calendar.html?${params.toString()}`;
}

function construirRedirectOk(empleadoId, correo) {
    return `/Views/calendar.html?estado=ok&empleadoId=${encodeURIComponent(
        empleadoId
    )}&correo=${encodeURIComponent(correo || "")}`;
}

async function conectarCalendar(req, res) {
    const empleadoId = req.query.empleadoId || "";

    try {
        if (!empleadoId) {
            return res.redirect(
                construirRedirectError(
                    "No se recibió el ID del empleado."
                )
            );
        }

        const empleado = await getEmployeeById(empleadoId);

        if (!empleado) {
            return res.redirect(
                construirRedirectError(
                    "El empleado no existe en Firestore.",
                    empleadoId
                )
            );
        }

        const correoEmpleado =
            empleado.correo ||
            empleado.email ||
            "";

        const url = generarUrlGoogleCalendar(
            empleadoId,
            correoEmpleado
        );

        return res.redirect(url);
    } catch (error) {
        console.error("Error al conectar Google Calendar:", error);

        return res.redirect(
            construirRedirectError(
                error.message ||
                "No fue posible iniciar la conexión con Google Calendar.",
                empleadoId
            )
        );
    }
}

async function callbackCalendar(req, res) {
    try {
        const { code, state, error: errorGoogle } = req.query;

        if (errorGoogle) {
            return res.redirect(
                construirRedirectError(
                    `Google rechazó la autorización: ${errorGoogle}`
                )
            );
        }

        if (!code) {
            return res.redirect(
                construirRedirectError(
                    "No se recibió el código de autorización de Google."
                )
            );
        }

        if (!state) {
            return res.redirect(
                construirRedirectError("No se recibió el ID del empleado.")
            );
        }

        const empleadoId = state;

        const empleado = await getEmployeeById(empleadoId);

        if (!empleado) {
            return res.redirect(
                construirRedirectError("El empleado no existe en Firestore.")
            );
        }

        const tokens = await obtenerTokensDesdeCodigo(code);

        if (!tokens.refresh_token) {
            return res.redirect(
                construirRedirectError(
                    "No se recibió refresh_token. Revoca el acceso de la app en Google y vuelve a conectar."
                )
            );
        }

        const oauth2Client = crearOAuthClient();

        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: "v2"
        });

        const perfil = await oauth2.userinfo.get();

        const correoEmpleado = String(
            empleado.correo ||
            empleado.email ||
            ""
        ).toLowerCase();

        const correoGoogle = String(
            perfil.data.email ||
            ""
        ).toLowerCase();

        if (
            correoEmpleado &&
            correoGoogle &&
            correoEmpleado !== correoGoogle
        ) {
            return res.redirect(
                construirRedirectError(
                    `El correo conectado (${correoGoogle}) no coincide con el correo del empleado (${correoEmpleado}).`
                )
            );
        }

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
            construirRedirectOk(empleadoId, datosCalendar.correoGoogle)
        );
    } catch (error) {
        console.error("Error en callback de Google Calendar:", error);

        return res.redirect(
            construirRedirectError(
                error.message ||
                "No fue posible conectar Google Calendar."
            )
        );
    }
}

const {
    generarUrlGoogleCalendar,
    obtenerTokensDesdeCodigo,
    crearOAuthClient
} = require("../services/GoogleCalendar");