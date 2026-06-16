const { google } = require("googleapis");

function createGmailClient() {
    const {
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_GMAIL_REFRESH_TOKEN,
        GOOGLE_GMAIL_REDIRECT_URI,
        GOOGLE_DRIVE_REDIRECT_URI
    } = process.env;

    if (!GOOGLE_CLIENT_ID) {
        throw new Error("Falta GOOGLE_CLIENT_ID en las variables de entorno.");
    }

    if (!GOOGLE_CLIENT_SECRET) {
        throw new Error("Falta GOOGLE_CLIENT_SECRET en las variables de entorno.");
    }

    if (!GOOGLE_GMAIL_REFRESH_TOKEN) {
        throw new Error("Falta GOOGLE_GMAIL_REFRESH_TOKEN en las variables de entorno.");
    }

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

function escapeHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
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

function getAttachmentLink(ticket) {
    const adjunto = ticket?.archivoAdjunto;

    return (
        adjunto?.webViewLink ||
        adjunto?.enlace ||
        adjunto?.url ||
        ""
    );
}

function getPriorityConfig(prioridad) {
    const valor = String(prioridad || "media").toLowerCase();

    if (valor === "alta") {
        return {
            texto: "Alta",
            background: "#fff3cd",
            color: "#856404",
            border: "#ffe08a"
        };
    }

    if (valor === "critica" || valor === "crítica") {
        return {
            texto: "Crítica",
            background: "#f8d7da",
            color: "#842029",
            border: "#f5c2c7"
        };
    }

    if (valor === "baja") {
        return {
            texto: "Baja",
            background: "#d1ecf1",
            color: "#0c5460",
            border: "#bee5eb"
        };
    }

    return {
        texto: "Media",
        background: "#dbeafe",
        color: "#1e3a8a",
        border: "#bfdbfe"
    };
}

function buildPlainTextTicketEmailBody(ticket) {
    const enlaceTickets =
        process.env.CRM_TICKETS_URL ||
        "https://crm-c40k.onrender.com/Views/tickets.html";

    const numeroTicket =
        ticket.numeroTicket ||
        ticket.id ||
        "Sin número";

    const enlaceAdjunto =
        getAttachmentLink(ticket);

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

function buildHtmlTicketEmailBody(ticket) {
    const enlaceTickets =
        process.env.CRM_TICKETS_URL ||
        "https://crm-c40k.onrender.com/Views/tickets.html";

    const numeroTicket =
        ticket.numeroTicket ||
        ticket.id ||
        "Sin número";

    const enlaceAdjunto =
        getAttachmentLink(ticket);

    const prioridadConfig =
        getPriorityConfig(ticket.prioridad);

    const numeroSeguro =
        escapeHtml(numeroTicket);

    const titulo =
        escapeHtml(ticket.titulo || "Sin título");

    const empleadoNombre =
        escapeHtml(ticket.empleadoNombre || "equipo");

    const clienteNombre =
        escapeHtml(ticket.clienteNombre || "No asignado");

    const areaName =
        escapeHtml(ticket.areaName || "No asignada");

    const usuarioNombre =
        escapeHtml(ticket.usuarioNombre || "Usuario");

    const fechaVencimiento =
        escapeHtml(formatDate(ticket.fechaVencimiento));

    const descripcion =
        escapeHtml(ticket.descripcion || "Sin descripción")
            .replaceAll("\n", "<br>");

    const enlaceTicketsSeguro =
        escapeHtml(enlaceTickets);

    const enlaceAdjuntoSeguro =
        escapeHtml(enlaceAdjunto);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nuevo ticket asignado</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
    <div style="width: 100%; padding: 28px 0;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
            
            <div style="background-color: #0f172a; padding: 26px 30px;">
                <div style="font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #93c5fd; font-weight: bold;">
                    CRM Voyager
                </div>

                <h1 style="margin: 10px 0 0; color: #ffffff; font-size: 24px; line-height: 1.3;">
                    Nuevo ticket asignado
                </h1>

                <p style="margin: 10px 0 0; color: #cbd5e1; font-size: 15px;">
                    Hola ${empleadoNombre}, se te ha asignado un nuevo ticket.
                </p>
            </div>

            <div style="padding: 28px 30px;">
                <div style="margin-bottom: 22px;">
                    <span style="display: inline-block; padding: 7px 12px; border-radius: 999px; background-color: #eef2ff; color: #3730a3; font-size: 13px; font-weight: bold;">
                        Ticket #${numeroSeguro}
                    </span>

                    <span style="display: inline-block; margin-left: 8px; padding: 7px 12px; border-radius: 999px; background-color: ${prioridadConfig.background}; color: ${prioridadConfig.color}; border: 1px solid ${prioridadConfig.border}; font-size: 13px; font-weight: bold;">
                        Prioridad ${escapeHtml(prioridadConfig.texto)}
                    </span>
                </div>

                <h2 style="margin: 0 0 18px; color: #111827; font-size: 22px; line-height: 1.35;">
                    ${titulo}
                </h2>

                <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                    <div style="padding: 14px 18px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                        <strong style="font-size: 15px; color: #111827;">
                            Información del ticket
                        </strong>
                    </div>

                    <div style="padding: 0 18px;">
                        <div style="padding: 14px 0; border-bottom: 1px solid #edf0f3;">
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">
                                Cliente
                            </div>
                            <div style="font-size: 15px; color: #111827; margin-top: 4px;">
                                ${clienteNombre}
                            </div>
                        </div>

                        <div style="padding: 14px 0; border-bottom: 1px solid #edf0f3;">
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">
                                Área
                            </div>
                            <div style="font-size: 15px; color: #111827; margin-top: 4px;">
                                ${areaName}
                            </div>
                        </div>

                        <div style="padding: 14px 0; border-bottom: 1px solid #edf0f3;">
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">
                                Fecha de vencimiento
                            </div>
                            <div style="font-size: 15px; color: #111827; margin-top: 4px;">
                                ${fechaVencimiento}
                            </div>
                        </div>

                        <div style="padding: 14px 0;">
                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">
                                Creado por
                            </div>
                            <div style="font-size: 15px; color: #111827; margin-top: 4px;">
                                ${usuarioNombre}
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 10px; font-size: 16px; color: #111827;">
                        Descripción
                    </h3>

                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; font-size: 15px; line-height: 1.6; color: #374151;">
                        ${descripcion}
                    </div>
                </div>

                ${
                    enlaceAdjunto
                        ? `
                            <div style="margin-bottom: 24px;">
                                <a href="${enlaceAdjuntoSeguro}" target="_blank" style="display: inline-block; background-color: #f3f4f6; color: #111827; text-decoration: none; padding: 12px 18px; border-radius: 10px; border: 1px solid #d1d5db; font-size: 14px; font-weight: bold;">
                                    Abrir adjunto en Google Drive
                                </a>
                            </div>
                        `
                        : `
                            <div style="margin-bottom: 24px; color: #6b7280; font-size: 14px;">
                                Este ticket no tiene adjuntos.
                            </div>
                        `
                }

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${enlaceTicketsSeguro}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: bold;">
                        Ver tickets en CRM Voyager
                    </a>
                </div>
            </div>

            <div style="background-color: #f9fafb; padding: 18px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                    Este correo fue enviado automáticamente por CRM Voyager.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`.trim();
}

function buildRawEmail({ to, subject, textBody, htmlBody }) {
    const boundary = `crm_voyager_boundary_${Date.now()}`;

    const message = [
        `To: ${to}`,
        `Subject: ${encodeSubject(subject)}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        textBody,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        htmlBody,
        "",
        `--${boundary}--`
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

    const textBody =
        buildPlainTextTicketEmailBody(ticket);

    const htmlBody =
        buildHtmlTicketEmailBody(ticket);

    const raw = buildRawEmail({
        to: employee.correo,
        subject,
        textBody,
        htmlBody
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