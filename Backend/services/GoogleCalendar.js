const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

function generarUrlGoogleCalendar(empleadoId) {
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        state: empleadoId,
        scope: [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ]
    });
}

async function obtenerTokensDesdeCodigo(code) {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

async function crearEventoTicket({ refreshToken, titulo, descripcion, fechaVencimiento, correoEmpleado }) {
    const cliente = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    cliente.setCredentials({
        refresh_token: refreshToken
    });

    const calendar = google.calendar({
        version: "v3",
        auth: cliente
    });

    const evento = {
        summary: `Vence ticket: ${titulo}`,
        description: descripcion || "Ticket asignado desde CRM Voyager.",
        start: {
            date: fechaVencimiento
        },
        end: {
            date: fechaVencimiento
        }
    };

    if (correoEmpleado) {
        evento.attendees = [
            {
                email: correoEmpleado
            }
        ];
    }

    const respuesta = await calendar.events.insert({
        calendarId: "primary",
        requestBody: evento
    });

    return respuesta.data;
}

module.exports = {
    generarUrlGoogleCalendar,
    obtenerTokensDesdeCodigo,
    crearEventoTicket
};