const { google } = require("googleapis");

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_GMAIL_REFRESH_TOKEN,
    GOOGLE_GMAIL_REDIRECT_URI,
    GOOGLE_DRIVE_REDIRECT_URI,
    CRM_TICKETS_URL
} = process.env;

if (!GOOGLE_CLIENT_ID) {
    throw new Error("Falta GOOGLE_CLIENT_ID en el .env");
}

if (!GOOGLE_CLIENT_SECRET) {
    throw new Error("Falta GOOGLE_CLIENT_SECRET en el .env");
}

if (!GOOGLE_GMAIL_REFRESH_TOKEN) {
    throw new Error("Falta GOOGLE_GMAIL_REFRESH_TOKEN en el .env");
}

function createGmailClient() {
    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_GMAIL_REDIRECT_URI || GOOGLE_DRIVE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        refresh_token: GOOGLE_GMAIL_REFRESH_TOKEN
    });

    return google.gmail({
        version: "v1",
        auth: oauth2Client
    });
}

function encodeBase64Url(texto) {
    return Buffer
        .from(texto, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function encodeSubject(texto) {
    return `=?UTF-8?B?${Buffer.from(texto, "utf8").toString("base64")}?=`;
}

function formatDate(fecha) {
    if (!fecha) {
        return "Sin fecha de vencimiento";
    }

    const fechaParseada = new Date(fecha);

    if (Number.isNaN(fechaParseada.getTime())) {
        return "Sin fecha de vencimiento";
    }

    return fechaParseada.toLocaleDateString("es-CR");
}

function buildTicketEmailBody(ticket) {
    const enlaceTickets =
        CRM_TICKETS_URL ||
        "https://crm-c40k.onrender.com/Views/tickets.html";

    const numeroTicket =
        ticket.numeroTicket ||
        ticket.id ||
        "Sin número";

    const adjunto = ticket.archivoAdjunto;

    const enlaceAdjunto =
        adjunto?.webViewLink ||
        adjunto?.enlace ||
        adjunto?.url ||
        "";

    return `
Hola ${ticket.empleadoNombre || "equipo"},

Se te ha asignado un nuevo ticket en CRM Voyager.

Información del ticket:

Número: ${numeroTicket}
Título: ${ticket.titulo || "Sin título"}
Cliente: ${ticket.clienteNombre || "No asignado"}
Área: ${ticket.areaName || "No asignada"}
Prioridad: ${ticket.prioridad || "media"}
Fecha de vencimiento: ${formatDate(ticket.fechaVencimiento)}
Creado por: ${ticket.usuarioNombre || "Usuario"}

Descripción:
${ticket.descripcion || "Sin descripción"}

${enlaceAdjunto ? `Adjunto: ${enlaceAdjunto}` : "Adjunto: Sin adjunto"}

Puedes revisar los tickets aquí:
${enlaceTickets}

Saludos,
CRM Voyager
`.trim();
}

function buildRawEmail({ to, subject, body }) {
    const message = [
        `To: ${to}`,
        `Subject: ${encodeSubject(subject)}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "",
        body
    ].join("\r\n");

    return encodeBase64Url(message);
}

async function sendTicketAssignmentEmail({ employee, ticket }) {
    if (!employee?.correo) {
        return {
            enviado: false,
            motivo: "El empleado no tiene correo registrado."
        };
    }

    const gmail = createGmailClient();

    const numeroTicket =
        ticket.numeroTicket ||
        ticket.id ||
        "";

    const subject =
        numeroTicket
            ? `Nuevo ticket asignado #${numeroTicket}`
            : "Nuevo ticket asignado";

    const body = buildTicketEmailBody(ticket);

    const raw = buildRawEmail({
        to: employee.correo,
        subject,
        body
    });

    const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw
        }
    });

    return {
        enviado: true,
        gmailMessageId: response.data.id || null,
        destinatario: employee.correo
    };
}

module.exports = {
    sendTicketAssignmentEmail
};