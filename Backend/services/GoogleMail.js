const {
    google
} = require("googleapis");

function createGmailClient() {
    const {
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_GMAIL_REFRESH_TOKEN,
        GOOGLE_GMAIL_REDIRECT_URI,
        GOOGLE_DRIVE_REDIRECT_URI
    } = process.env;

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

    if (!GOOGLE_GMAIL_REFRESH_TOKEN) {
        throw new Error(
            "Falta GOOGLE_GMAIL_REFRESH_TOKEN en las variables de entorno."
        );
    }

    const oauth2Client =
        new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_GMAIL_REDIRECT_URI ||
            GOOGLE_DRIVE_REDIRECT_URI
        );

    oauth2Client.setCredentials({
        refresh_token:
            GOOGLE_GMAIL_REFRESH_TOKEN
    });

    return google.gmail({
        version:
            "v1",

        auth:
            oauth2Client
    });
}

function encodeBase64Url(text) {
    return Buffer
        .from(
            text,
            "utf8"
        )
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function encodeSubject(text) {
    const encoded =
        Buffer
            .from(
                String(text || ""),
                "utf8"
            )
            .toString("base64");

    return `=?UTF-8?B?${encoded}?=`;
}

function sanitizeHeaderValue(value) {
    return String(value || "")
        .replace(
            /[\r\n]+/g,
            " "
        )
        .trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#39;"
        );
}

function parseDateValue(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(
            value.getTime()
        )
            ? null
            : value;
    }

    if (
        typeof value ===
            "object" &&
        typeof value.toDate ===
            "function"
    ) {
        const parsed =
            value.toDate();

        return Number.isNaN(
            parsed.getTime()
        )
            ? null
            : parsed;
    }

    if (
        typeof value ===
            "object" &&
        typeof value.seconds ===
            "number"
    ) {
        return new Date(
            value.seconds *
            1000
        );
    }

    if (
        typeof value ===
            "object" &&
        typeof value._seconds ===
            "number"
    ) {
        return new Date(
            value._seconds *
            1000
        );
    }

    const dateOnlyMatch =
        String(value).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (dateOnlyMatch) {
        return new Date(
            Number(dateOnlyMatch[1]),
            Number(dateOnlyMatch[2]) - 1,
            Number(dateOnlyMatch[3])
        );
    }

    const parsed =
        new Date(value);

    return Number.isNaN(
        parsed.getTime()
    )
        ? null
        : parsed;
}

function formatDate(value) {
    const parsed =
        parseDateValue(value);

    return parsed
        ? parsed.toLocaleDateString(
            "es-CR"
        )
        : "Sin fecha de vencimiento";
}

function formatDateTime(value) {
    const parsed =
        parseDateValue(value);

    return parsed
        ? parsed.toLocaleString(
            "es-CR"
        )
        : "Sin fecha";
}

function getTicketsUrl() {
    if (
        process.env
            .CRM_TICKETS_URL
    ) {
        return process.env
            .CRM_TICKETS_URL;
    }

    const frontendBaseUrl =
        process.env
            .FRONTEND_BASE_URL ||
        process.env
            .APP_ORIGIN ||
        "";

    if (frontendBaseUrl) {
        return (
            `${frontendBaseUrl.replace(/\/$/, "")}` +
            "/Views/tickets.html"
        );
    }

    return (
        "https://crm-c40k.onrender.com/Views/tickets.html"
    );
}

function getAttachment(source) {
    const attachment =
        source?.archivoAdjunto ||
        source?.archivo ||
        source?.attachment ||
        null;

    if (!attachment) {
        return null;
    }

    if (
        typeof attachment ===
        "string"
    ) {
        return {
            name:
                "Archivo adjunto",

            link:
                attachment,

            isFolder:
                false
        };
    }

    const link =
        attachment.webViewLink ||
        attachment.enlaceVisualizacion ||
        attachment.enlace ||
        attachment.url ||
        attachment.link ||
        "";

    if (!link) {
        return null;
    }

    const attachmentType =
        String(
            attachment.tipoAdjunto ||
            ""
        )
            .trim()
            .toLowerCase();

    const mimeType =
        String(
            attachment.tipo ||
            attachment.mimeType ||
            attachment.mimetype ||
            ""
        )
            .trim()
            .toLowerCase();

    const isFolder =
        attachmentType ===
            "carpeta" ||
        mimeType ===
            "application/vnd.google-apps.folder";

    return {
        name:
            attachment.nombre ||
            attachment.name ||
            (
                isFolder
                    ? "Carpeta adjunta"
                    : "Archivo adjunto"
            ),

        link,

        isFolder
    };
}

function getPriorityConfig(priority) {
    const value =
        String(
            priority ||
            "media"
        )
            .trim()
            .toLowerCase();

    if (value === "alta") {
        return {
            text:
                "Alta",

            background:
                "#fff3cd",

            color:
                "#856404"
        };
    }

    if (
        value === "critica" ||
        value === "crítica"
    ) {
        return {
            text:
                "Crítica",

            background:
                "#f8d7da",

            color:
                "#842029"
        };
    }

    if (value === "baja") {
        return {
            text:
                "Baja",

            background:
                "#d1ecf1",

            color:
                "#0c5460"
        };
    }

    return {
        text:
            "Media",

        background:
            "#dbeafe",

        color:
            "#1e3a8a"
    };
}

function buildRawEmail({
    to,
    subject,
    textBody,
    htmlBody
}) {
    const boundary =
        (
            `crm_voyager_` +
            `${Date.now()}_` +
            `${Math.random()}`
        )
            .replace(
                ".",
                "_"
            );

    const message = [
        `To: ${sanitizeHeaderValue(to)}`,
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

    return encodeBase64Url(
        message
    );
}

async function sendEmail({
    to,
    subject,
    textBody,
    htmlBody
}) {
    const recipient =
        sanitizeHeaderValue(to);

    if (!recipient) {
        return {
            enviado:
                false,

            motivo:
                "No se recibió un correo destinatario."
        };
    }

    const gmail =
        createGmailClient();

    const raw =
        buildRawEmail({
            to:
                recipient,

            subject,
            textBody,
            htmlBody
        });

    const response =
        await gmail
            .users
            .messages
            .send({
                userId:
                    "me",

                requestBody: {
                    raw
                }
            });

    return {
        enviado:
            true,

        gmailMessageId:
            response.data.id ||
            null,

        destinatario:
            recipient
    };
}

function buildInfoRow(
    label,
    value
) {
    return `
        <div style="padding: 12px 0; border-bottom: 1px solid #edf0f3;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">
                ${escapeHtml(label)}
            </div>

            <div style="font-size: 15px; color: #111827; margin-top: 4px;">
                ${escapeHtml(value)}
            </div>
        </div>
    `;
}

function buildEmailLayout({
    title,
    subtitle,
    badge,
    bodyHtml,
    buttonText,
    buttonUrl
}) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
    <div style="width: 100%; padding: 28px 0;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">

            <div style="background-color: #0f172a; padding: 26px 30px;">
                <div style="font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #93c5fd; font-weight: bold;">
                    CRM Voyager
                </div>

                <h1 style="margin: 10px 0 0; color: #ffffff; font-size: 24px; line-height: 1.3;">
                    ${escapeHtml(title)}
                </h1>

                <p style="margin: 10px 0 0; color: #cbd5e1; font-size: 15px;">
                    ${escapeHtml(subtitle)}
                </p>
            </div>

            <div style="padding: 28px 30px;">
                <div style="margin-bottom: 22px;">
                    <span style="display: inline-block; padding: 7px 12px; border-radius: 999px; background-color: #eef2ff; color: #3730a3; font-size: 13px; font-weight: bold;">
                        ${escapeHtml(badge)}
                    </span>
                </div>

                ${bodyHtml}

                <div style="text-align: center; margin-top: 30px;">
                    <a
                        href="${escapeHtml(buttonUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: bold;"
                    >
                        ${escapeHtml(buttonText)}
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

function buildAttachmentHtml(
    attachment,
    buttonText
) {
    if (!attachment) {
        return `
            <div style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                Sin archivos adjuntos.
            </div>
        `;
    }

    return `
        <div style="margin-top: 20px;">
            <a
                href="${escapeHtml(attachment.link)}"
                target="_blank"
                rel="noopener noreferrer"
                style="display: inline-block; background-color: #f3f4f6; color: #111827; text-decoration: none; padding: 12px 18px; border-radius: 10px; border: 1px solid #d1d5db; font-size: 14px; font-weight: bold;"
            >
                ${escapeHtml(buttonText)}
            </a>
        </div>
    `;
}

function buildPlainTextTicketEmailBody(ticket) {
    const ticketsUrl =
        getTicketsUrl();

    const ticketNumber =
        ticket.numeroTicket ||
        ticket.id ||
        "Sin número";

    const attachment =
        getAttachment(ticket);

    return `
Hola ${ticket.empleadoNombre || "equipo"},

Se te ha asignado un nuevo ticket en CRM Voyager.

Número: ${ticketNumber}
Título: ${ticket.titulo || "Sin título"}
Cliente: ${ticket.clienteNombre || "No asignado"}
Área: ${ticket.areaName || "No asignada"}
Prioridad: ${ticket.prioridad || "media"}
Fecha de vencimiento: ${formatDate(
        ticket.fechaVencimiento ||
        ticket.expirationDate
    )}
Creado por: ${ticket.usuarioNombre || "Usuario"}

Descripción:
${ticket.descripcion || "Sin descripción"}

${
    attachment
        ? (
            `${attachment.isFolder ? "Carpeta" : "Adjunto"}: ` +
            attachment.link
        )
        : "Adjunto: Sin adjunto"
}

Puedes revisar los tickets aquí:
${ticketsUrl}

Saludos,
CRM Voyager
`.trim();
}

function buildHtmlTicketEmailBody(ticket) {
    const ticketsUrl =
        getTicketsUrl();

    const ticketNumber =
        ticket.numeroTicket ||
        ticket.id ||
        "Sin número";

    const priority =
        getPriorityConfig(
            ticket.prioridad
        );

    const attachment =
        getAttachment(ticket);

    const description =
        escapeHtml(
            ticket.descripcion ||
            "Sin descripción"
        )
            .replaceAll(
                "\n",
                "<br>"
            );

    const bodyHtml = `
        <div style="margin-bottom: 18px;">
            <span style="display: inline-block; padding: 7px 12px; border-radius: 999px; background-color: ${priority.background}; color: ${priority.color}; font-size: 13px; font-weight: bold;">
                Prioridad ${escapeHtml(priority.text)}
            </span>
        </div>

        <h2 style="margin: 0 0 18px; color: #111827; font-size: 22px; line-height: 1.35;">
            ${escapeHtml(ticket.titulo || "Sin título")}
        </h2>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 0 18px; margin-bottom: 24px;">
            ${buildInfoRow(
                "Cliente",
                ticket.clienteNombre ||
                "No asignado"
            )}

            ${buildInfoRow(
                "Área",
                ticket.areaName ||
                "No asignada"
            )}

            ${buildInfoRow(
                "Fecha de vencimiento",
                formatDate(
                    ticket.fechaVencimiento ||
                    ticket.expirationDate
                )
            )}

            ${buildInfoRow(
                "Creado por",
                ticket.usuarioNombre ||
                "Usuario"
            )}
        </div>

        <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 10px; font-size: 16px; color: #111827;">
                Descripción
            </h3>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; font-size: 15px; line-height: 1.6; color: #374151;">
                ${description}
            </div>

            ${buildAttachmentHtml(
                attachment,

                attachment?.isFolder
                    ? "Abrir carpeta adjunta"
                    : "Abrir archivo adjunto"
            )}
        </div>
    `;

    return buildEmailLayout({
        title:
            "Nuevo ticket asignado",

        subtitle:
            (
                `Hola ${ticket.empleadoNombre || "equipo"}, ` +
                "se te ha asignado un nuevo ticket."
            ),

        badge:
            `Ticket #${ticketNumber}`,

        bodyHtml,

        buttonText:
            "Ver tickets en CRM Voyager",

        buttonUrl:
            ticketsUrl
    });
}

function buildPlainTextCommentEmailBody({
    ticket,
    comment
}) {
    const ticketsUrl =
        getTicketsUrl();

    const ticketNumber =
        ticket.numeroTicket ||
        ticket.id ||
        "Sin número";

    const attachment =
        getAttachment(comment);

    return `
Hola ${ticket.empleadoNombre || "equipo"},

${comment.autorNombre || "Un usuario"} agregó un comentario al ticket #${ticketNumber}.

Título: ${ticket.titulo || "Sin título"}
Cliente: ${ticket.clienteNombre || "No asignado"}
Área: ${ticket.areaName || "No asignada"}
Fecha del comentario: ${formatDateTime(comment.createdAt)}

Comentario:
${comment.comentario || "Sin contenido"}

${
    attachment
        ? (
            `${attachment.isFolder ? "Carpeta adjunta" : "Archivo adjunto"}: ` +
            attachment.link
        )
        : "Adjunto del comentario: Sin adjunto"
}

Puedes revisar el ticket y responder aquí:
${ticketsUrl}

Saludos,
CRM Voyager
`.trim();
}

function buildHtmlCommentEmailBody({
    ticket,
    comment
}) {
    const ticketsUrl =
        getTicketsUrl();

    const ticketNumber =
        ticket.numeroTicket ||
        ticket.id ||
        "Sin número";

    const attachment =
        getAttachment(comment);

    const commentText =
        escapeHtml(
            comment.comentario ||
            "Sin contenido"
        )
            .replaceAll(
                "\n",
                "<br>"
            );

    const bodyHtml = `
        <h2 style="margin: 0 0 18px; color: #111827; font-size: 22px; line-height: 1.35;">
            ${escapeHtml(ticket.titulo || "Sin título")}
        </h2>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 0 18px; margin-bottom: 24px;">
            ${buildInfoRow(
                "Autor",
                comment.autorNombre ||
                "Usuario"
            )}

            ${buildInfoRow(
                "Cliente",
                ticket.clienteNombre ||
                "No asignado"
            )}

            ${buildInfoRow(
                "Área",
                ticket.areaName ||
                "No asignada"
            )}

            ${buildInfoRow(
                "Fecha",
                formatDateTime(
                    comment.createdAt
                )
            )}
        </div>

        <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 10px; font-size: 16px; color: #111827;">
                Comentario
            </h3>

            <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; border-radius: 10px; padding: 16px; font-size: 15px; line-height: 1.6; color: #374151;">
                ${commentText}
            </div>

            ${buildAttachmentHtml(
                attachment,

                attachment?.isFolder
                    ? "Abrir carpeta del comentario"
                    : "Abrir archivo del comentario"
            )}
        </div>
    `;

    return buildEmailLayout({
        title:
            "Nuevo comentario en un ticket",

        subtitle:
            (
                `Hola ${ticket.empleadoNombre || "equipo"}, ` +
                "tienes una nueva actualización."
            ),

        badge:
            `Ticket #${ticketNumber}`,

        bodyHtml,

        buttonText:
            "Ver ticket y comentarios",

        buttonUrl:
            ticketsUrl
    });
}

async function sendTicketAssignmentEmail({
    employee,
    ticket
}) {
    const employeeEmail =
        employee?.correo ||
        employee?.email ||
        "";

    if (!employeeEmail) {
        return {
            enviado:
                false,

            motivo:
                "El empleado no tiene correo registrado."
        };
    }

    if (!ticket) {
        return {
            enviado:
                false,

            motivo:
                "No se recibió la información del ticket."
        };
    }

    const ticketNumber =
        ticket.numeroTicket ||
        ticket.id ||
        "";

    const subject =
        ticketNumber
            ? `Nuevo ticket asignado #${ticketNumber}`
            : "Nuevo ticket asignado";

    return sendEmail({
        to:
            employeeEmail,

        subject,

        textBody:
            buildPlainTextTicketEmailBody(
                ticket
            ),

        htmlBody:
            buildHtmlTicketEmailBody(
                ticket
            )
    });
}

async function sendTicketCommentEmail({
    employee,
    ticket,
    comment
}) {
    const employeeEmail =
        employee?.correo ||
        employee?.email ||
        "";

    if (!employeeEmail) {
        return {
            enviado:
                false,

            motivo:
                "El empleado no tiene correo registrado."
        };
    }

    if (!ticket) {
        return {
            enviado:
                false,

            motivo:
                "No se recibió la información del ticket."
        };
    }

    if (!comment) {
        return {
            enviado:
                false,

            motivo:
                "No se recibió la información del comentario."
        };
    }

    const ticketNumber =
        ticket.numeroTicket ||
        ticket.id ||
        "";

    const subject =
        ticketNumber
            ? `Nuevo comentario en ticket #${ticketNumber}`
            : "Nuevo comentario en un ticket";

    return sendEmail({
        to:
            employeeEmail,

        subject,

        textBody:
            buildPlainTextCommentEmailBody({
                ticket,
                comment
            }),

        htmlBody:
            buildHtmlCommentEmailBody({
                ticket,
                comment
            })
    });
}

module.exports = {
    sendTicketAssignmentEmail,
    sendTicketCommentEmail
};