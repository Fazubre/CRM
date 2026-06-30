const { google } = require("googleapis");

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI,
    GOOGLE_REDIRECT_URI
} = process.env;

const REDIRECT_URI =
    GOOGLE_CALENDAR_REDIRECT_URI ||
    GOOGLE_REDIRECT_URI;

if (!GOOGLE_CLIENT_ID) {
    throw new Error(
        "Falta GOOGLE_CLIENT_ID en las variables de entorno."
    );
}

if (!GOOGLE_CLIENT_SECRET) {
    throw new Error(
        "Falta GOOGLE_CLIENT_SECRET en las variables de entorno."
    );
}

if (!REDIRECT_URI) {
    throw new Error(
        "Falta GOOGLE_CALENDAR_REDIRECT_URI o GOOGLE_REDIRECT_URI en las variables de entorno."
    );
}

function crearOAuthClient() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );
}

function generarUrlGoogleCalendar(empleadoId, correoEmpleado = "") {
    if (!empleadoId) {
        throw new Error(
            "Falta el empleadoId para conectar Google Calendar."
        );
    }

    const oauth2Client =
        crearOAuthClient();

    const opcionesAuth = {
        access_type: "offline",
        prompt: "consent select_account",
        state: empleadoId,
        include_granted_scopes: true,
        scope: [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ]
    };

    if (correoEmpleado) {
        opcionesAuth.login_hint = correoEmpleado;
    }

    return oauth2Client.generateAuthUrl(opcionesAuth);
}

async function obtenerTokensDesdeCodigo(code) {
    if (!code) {
        throw new Error(
            "Google no devolvió un código de autorización."
        );
    }

    const oauth2Client =
        crearOAuthClient();

    const { tokens } =
        await oauth2Client.getToken(code);

    return tokens;
}

function crearClienteCalendar(refreshToken) {
    if (!refreshToken) {
        throw new Error(
            "No existe refresh_token para utilizar Google Calendar."
        );
    }

    const oauth2Client =
        crearOAuthClient();

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return google.calendar({
        version: "v3",
        auth: oauth2Client
    });
}

function normalizarFecha(fechaValor) {
    if (!fechaValor) {
        throw new Error(
            "El ticket no tiene fecha de vencimiento."
        );
    }

    if (typeof fechaValor === "string") {
        const fechaTexto =
            fechaValor.trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
            return fechaTexto;
        }

        const fechaConvertida =
            new Date(fechaTexto);

        if (!Number.isNaN(fechaConvertida.getTime())) {
            return fechaConvertida
                .toISOString()
                .slice(0, 10);
        }
    }

    if (
        typeof fechaValor === "object" &&
        typeof fechaValor.seconds === "number"
    ) {
        return new Date(fechaValor.seconds * 1000)
            .toISOString()
            .slice(0, 10);
    }

    if (
        typeof fechaValor === "object" &&
        typeof fechaValor._seconds === "number"
    ) {
        return new Date(fechaValor._seconds * 1000)
            .toISOString()
            .slice(0, 10);
    }

    if (fechaValor instanceof Date) {
        if (Number.isNaN(fechaValor.getTime())) {
            throw new Error(
                "La fecha de vencimiento no tiene un formato válido."
            );
        }

        return fechaValor
            .toISOString()
            .slice(0, 10);
    }

    throw new Error(
        "La fecha de vencimiento no tiene un formato válido."
    );
}

function sumarUnDia(fechaTexto) {
    const fecha =
        new Date(`${fechaTexto}T00:00:00.000Z`);

    if (Number.isNaN(fecha.getTime())) {
        throw new Error(
            "La fecha de vencimiento no tiene un formato válido."
        );
    }

    fecha.setUTCDate(
        fecha.getUTCDate() + 1
    );

    return fecha
        .toISOString()
        .slice(0, 10);
}

async function crearEventoTicket({
    refreshToken,
    titulo,
    descripcion,
    fechaVencimiento,
    correoEmpleado
}) {
    const calendar =
        crearClienteCalendar(refreshToken);

    const fechaInicio =
        normalizarFecha(fechaVencimiento);

    const fechaFin =
        sumarUnDia(fechaInicio);

    const evento = {
        summary:
            `Vence ticket: ${titulo || "Sin título"}`,

        description:
            descripcion ||
            "Ticket asignado desde CRM Voyager.",

        start: {
            date: fechaInicio
        },

        end: {
            date: fechaFin
        },

        reminders: {
            useDefault: false,
            overrides: [
                {
                    method: "popup",
                    minutes: 24 * 60
                }
            ]
        }
    };

    if (correoEmpleado) {
        evento.attendees = [
            {
                email: correoEmpleado
            }
        ];
    }

    const respuesta =
        await calendar.events.insert({
            calendarId: "primary",
            requestBody: evento
        });

    return respuesta.data;
}

module.exports = {
    generarUrlGoogleCalendar,
    obtenerTokensDesdeCodigo,
    crearEventoTicket,
    crearOAuthClient
};