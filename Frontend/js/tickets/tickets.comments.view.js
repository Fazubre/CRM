import {
    getTicketComments
} from "./tickets.api.js";

import {
    getTicketAttachment
} from "./tickets.attachments.js";

import {
    openCommentsModal
} from "./tickets.comments.js";

import {
    ticketsState
} from "./tickets.state.js";

import {
    convertirLinksClickeables,
    escapeHtml,
    formatDateTime
} from "./tickets.utils.js";

let viewCommentEventsInitialized =
    false;

export function setupViewCommentEvents() {
    if (
        viewCommentEventsInitialized
    ) {
        return;
    }

    viewCommentEventsInitialized =
        true;

    document
        .getElementById(
            "btnRecargarComentariosVer"
        )
        ?.addEventListener(
            "click",
            async () => {
                const ticket =
                    ticketsState
                        .ticketComentariosActual;

                if (!ticket?.id) {
                    return;
                }

                await loadViewTicketComments(
                    ticket
                );
            }
        );

    document
        .getElementById(
            "btnGestionarComentariosDesdeVer"
        )
        ?.addEventListener(
            "click",
            openCommentManagement
        );
}

export async function loadViewTicketComments(
    ticket
) {
    const container =
        document.getElementById(
            "verListaComentarios"
        );

    const countBadge =
        document.getElementById(
            "verCantidadComentarios"
        );

    if (!container) {
        return;
    }

    if (!ticket?.id) {
        renderCommentsError(
            "No se recibió un ticket válido."
        );

        return;
    }

    ticketsState.ticketComentariosActual =
        ticket;

    container.innerHTML = `
        <div class="text-center text-muted py-4">
            <div
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
            ></div>

            Cargando comentarios...
        </div>
    `;

    if (countBadge) {
        countBadge.textContent =
            "...";
    }

    try {
        const comments =
            await getTicketComments(
                ticket.id
            );

        ticketsState.comentarios =
            comments;

        renderViewComments(
            comments
        );
    } catch (error) {
        console.error(
            "Error cargando comentarios en Ver ticket:",
            error
        );

        if (
            handleUnauthorized(
                error
            )
        ) {
            return;
        }

        renderCommentsError(
            error.message ||
            "No fue posible cargar los comentarios."
        );
    }
}

function renderViewComments(
    comments
) {
    const container =
        document.getElementById(
            "verListaComentarios"
        );

    const countBadge =
        document.getElementById(
            "verCantidadComentarios"
        );

    if (!container) {
        return;
    }

    const safeComments =
        Array.isArray(
            comments
        )
            ? comments
            : [];

    if (countBadge) {
        countBadge.textContent =
            String(
                safeComments.length
            );
    }

    if (
        safeComments.length ===
        0
    ) {
        container.innerHTML = `
            <div
                class="text-center text-muted border rounded py-4"
            >
                <i
                    class="fa-regular fa-comments fa-2x mb-2"
                ></i>

                <p class="mb-0">
                    Este ticket todavía no tiene comentarios.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        safeComments
            .map(
                renderViewComment
            )
            .join("");
}

function renderViewComment(
    comment
) {
    const editedBadge =
        comment.editado
            ? `
                <span
                    class="badge bg-secondary ms-2"
                >
                    Editado
                </span>
            `
            : "";

    return `
        <article
            class="card mb-3 shadow-sm"
        >
            <div class="card-body">
                <div
                    class="d-flex justify-content-between align-items-start gap-3"
                >
                    <div>
                        <strong>
                            ${escapeHtml(
                                comment.autorNombre ||
                                "Usuario"
                            )}
                        </strong>

                        ${editedBadge}
                    </div>

                    <small
                        class="text-muted text-end"
                    >
                        ${escapeHtml(
                            formatDateTime(
                                comment.createdAt
                            )
                        )}
                    </small>
                </div>

                <div
                    class="mt-3"
                    style="white-space: pre-wrap;"
                >${convertirLinksClickeables(
                    comment.comentario ||
                    ""
                )}</div>

                ${renderViewCommentAttachment(
                    comment
                )}
            </div>
        </article>
    `;
}

function renderViewCommentAttachment(
    comment
) {
    const attachment =
        getTicketAttachment({
            archivoAdjunto:
                comment.archivoAdjunto
        });

    if (!attachment?.enlace) {
        return "";
    }

    const isFolder =
        attachment.tipoAdjunto ===
        "carpeta";

    const icon =
        isFolder
            ? "fa-folder-open"
            : "fa-paperclip";

    const buttonText =
        isFolder
            ? "Abrir carpeta adjunta"
            : "Abrir archivo adjunto";

    return `
        <div class="mt-3">
            <a
                href="${escapeHtml(
                    attachment.enlace
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline-secondary btn-sm"
            >
                <i
                    class="fa-solid ${icon} me-1"
                ></i>

                ${escapeHtml(
                    buttonText
                )}
            </a>
        </div>
    `;
}

function renderCommentsError(
    message
) {
    const container =
        document.getElementById(
            "verListaComentarios"
        );

    const countBadge =
        document.getElementById(
            "verCantidadComentarios"
        );

    if (countBadge) {
        countBadge.textContent =
            "!";
    }

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="alert alert-danger mb-0">
            ${escapeHtml(
                message
            )}
        </div>
    `;
}

async function openCommentManagement() {
    const ticket =
        ticketsState
            .ticketComentariosActual;

    if (!ticket?.id) {
        return;
    }

    const viewModalElement =
        document.getElementById(
            "modalVerTicket"
        );

    if (
        viewModalElement &&
        ticketsState
            .modals
            .ver
    ) {
        viewModalElement
            .addEventListener(
                "hidden.bs.modal",
                () => {
                    openCommentsModal(
                        ticket
                    ).catch(
                        (error) => {
                            console.error(
                                "Error abriendo comentarios:",
                                error
                            );
                        }
                    );
                },
                {
                    once:
                        true
                }
            );

        ticketsState
            .modals
            .ver
            .hide();

        return;
    }

    await openCommentsModal(
        ticket
    );
}

function handleUnauthorized(
    error
) {
    if (
        error?.status !==
        401
    ) {
        return false;
    }

    localStorage.removeItem(
        "usuarioCRM"
    );

    const loginUrl =
        window.CRM_CONFIG
            ?.LOGIN_URL ||
        "/CRM/Views/LogIn.html";

    window.location.replace(
        loginUrl
    );

    return true;
}