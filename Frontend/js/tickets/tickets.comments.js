import {
    createTicketComment,
    deleteTicketCommentRequest,
    getTicketComments,
    updateTicketComment
} from "./tickets.api.js";

import {
    appendAttachmentToFormData,
    clearAttachmentInputs,
    getAttachmentSelection,
    getTicketAttachment,
    markAttachmentInvalid,
    validateAttachmentSelection
} from "./tickets.attachments.js";

import {
    ticketsState
} from "./tickets.state.js";

import {
    checkUsuarioAdmin,
    convertirLinksClickeables,
    escapeHtml,
    formatDateTime,
    getUsuarioActual,
    hideAlert,
    setButtonLoading,
    showAlert,
    showGlobalMessage
} from "./tickets.utils.js";

export function setupCommentEvents() {
    document
        .getElementById(
            "formComentarioTicket"
        )
        ?.addEventListener(
            "submit",
            submitCommentForm
        );

    document
        .getElementById(
            "btnCancelarEdicionComentario"
        )
        ?.addEventListener(
            "click",
            resetCommentForm
        );

    document
        .getElementById(
            "btnRecargarComentarios"
        )
        ?.addEventListener(
            "click",
            loadCurrentTicketComments
        );

    document
        .getElementById(
            "listaComentariosTicket"
        )
        ?.addEventListener(
            "click",
            handleCommentAction
        );

    document
        .getElementById(
            "modalComentariosTicket"
        )
        ?.addEventListener(
            "hidden.bs.modal",
            resetCommentsModal
        );

    document
        .getElementById(
            "textoComentario"
        )
        ?.addEventListener(
            "input",
            clearCommentValidation
        );
}

function clearCommentValidation() {
    hideAlert(
        "alertaComentariosTicket"
    );

    document
        .getElementById(
            "textoComentario"
        )
        ?.classList.remove(
            "is-invalid"
        );
}

export async function openCommentsModal(
    ticket
) {
    if (!ticket?.id) {
        showGlobalMessage(
            "warning",
            "Ticket no encontrado",
            "No se encontró el ticket seleccionado."
        );

        return;
    }

    ticketsState.ticketComentariosActual =
        ticket;

    resetCommentForm();

    const reference =
        document.getElementById(
            "comentariosTicketReferencia"
        );

    if (reference) {
        const ticketNumber =
            ticket.numeroTicket ||
            ticket.id;

        reference.textContent =
            (
                `Ticket ${ticketNumber} · ` +
                `${ticket.titulo || "Sin título"}`
            );
    }

    const ticketIdInput =
        document.getElementById(
            "comentarioTicketId"
        );

    if (ticketIdInput) {
        ticketIdInput.value =
            ticket.id;
    }

    ticketsState
        .modals
        .comentarios
        ?.show();

    await loadCurrentTicketComments();
}

async function loadCurrentTicketComments() {
    const ticket =
        ticketsState
            .ticketComentariosActual;

    if (!ticket?.id) {
        return;
    }

    const list =
        document.getElementById(
            "listaComentariosTicket"
        );

    if (list) {
        list.innerHTML = `
            <div class="text-center text-muted py-4">
                <div
                    class="spinner-border spinner-border-sm me-2"
                    role="status"
                ></div>

                Cargando comentarios...
            </div>
        `;
    }

    try {
        ticketsState.comentarios =
            await getTicketComments(
                ticket.id
            );

        renderComments(
            ticketsState.comentarios
        );
    } catch (error) {
        console.error(
            "Error cargando comentarios:",
            error
        );

        if (
            handleUnauthorized(
                error
            )
        ) {
            return;
        }

        if (list) {
            list.innerHTML = `
                <div class="alert alert-danger mb-0">
                    ${escapeHtml(
                        error.message ||
                        "No fue posible cargar los comentarios."
                    )}
                </div>
            `;
        }
    }
}

function renderComments(
    comments
) {
    const list =
        document.getElementById(
            "listaComentariosTicket"
        );

    if (!list) {
        return;
    }

    if (
        !Array.isArray(
            comments
        ) ||
        comments.length ===
        0
    ) {
        list.innerHTML = `
            <div class="text-center text-muted border rounded py-4">
                <i class="fa-regular fa-comments fa-2x mb-2"></i>

                <p class="mb-0">
                    Este ticket todavía no tiene comentarios.
                </p>
            </div>
        `;

        return;
    }

    list.innerHTML =
        comments
            .map(
                renderCommentCard
            )
            .join("");
}

function renderCommentCard(
    comment
) {
    const canEdit =
        canCurrentUserEdit(
            comment
        );

    const canDelete =
        checkUsuarioAdmin();

    const editedBadge =
        comment.editado
            ? `
                <span class="badge bg-secondary ms-2">
                    Editado
                </span>
            `
            : "";

    const editAction =
        canEdit
            ? `
                <button
                    type="button"
                    class="btn btn-outline-warning btn-sm btn-editar-comentario"
                    data-comment-id="${escapeHtml(comment.id)}"
                >
                    <i class="fa-solid fa-pen me-1"></i>
                    Editar
                </button>
            `
            : "";

    const deleteAction =
        canDelete
            ? `
                <button
                    type="button"
                    class="btn btn-outline-danger btn-sm btn-eliminar-comentario"
                    data-comment-id="${escapeHtml(comment.id)}"
                >
                    <i class="fa-solid fa-trash me-1"></i>
                    Eliminar
                </button>
            `
            : "";

    const actions =
        canEdit ||
        canDelete
            ? `
                <div class="d-flex flex-wrap gap-2 mt-3">
                    ${editAction}
                    ${deleteAction}
                </div>
            `
            : "";

    return `
        <article class="card mb-3 shadow-sm">
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

                    <small class="text-muted text-end">
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

                ${renderCommentAttachment(
                    comment
                )}

                ${actions}
            </div>
        </article>
    `;
}

function renderCommentAttachment(
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

    const text =
        isFolder
            ? "Abrir carpeta adjunta"
            : "Abrir archivo adjunto";

    return `
        <div class="mt-3">
            <a
                href="${escapeHtml(attachment.enlace)}"
                class="btn btn-outline-secondary btn-sm"
                target="_blank"
                rel="noopener noreferrer"
            >
                <i class="fa-solid ${icon} me-1"></i>
                ${escapeHtml(text)}
            </a>
        </div>
    `;
}

async function submitCommentForm(
    event
) {
    event.preventDefault();

    const ticket =
        ticketsState
            .ticketComentariosActual;

    const form =
        document.getElementById(
            "formComentarioTicket"
        );

    const textarea =
        document.getElementById(
            "textoComentario"
        );

    const saveButton =
        document.getElementById(
            "btnGuardarComentario"
        );

    if (
        !ticket?.id ||
        !form ||
        !textarea ||
        !saveButton
    ) {
        return;
    }

    hideAlert(
        "alertaComentariosTicket"
    );

    const commentText =
        textarea
            .value
            .trim();

    if (!commentText) {
        textarea.classList.add(
            "is-invalid"
        );

        showAlert(
            "alertaComentariosTicket",
            "El texto del comentario es obligatorio."
        );

        return;
    }

    const attachmentSelection =
        getAttachmentSelection(
            "comentarioArchivoAdjunto",
            "comentarioCarpetaAdjunta"
        );

    const attachmentValidation =
        validateAttachmentSelection(
            attachmentSelection
        );

    if (
        !attachmentValidation
            .valido
    ) {
        markAttachmentInvalid(
            attachmentSelection,
            true
        );

        showAlert(
            "alertaComentariosTicket",
            attachmentValidation
                .mensaje
        );

        return;
    }

    markAttachmentInvalid(
        attachmentSelection,
        false
    );

    const editingComment =
        ticketsState
            .comentarioEditando;

    const formData =
        new FormData();

    formData.append(
        "comentario",
        commentText
    );

    appendAttachmentToFormData(
        formData,
        attachmentSelection
    );

    try {
        setButtonLoading(
            saveButton,
            true,

            editingComment
                ? "Guardando cambios..."
                : "Guardando comentario..."
        );

        if (editingComment?.id) {
            await updateTicketComment(
                ticket.id,
                editingComment.id,
                formData
            );
        } else {
            await createTicketComment(
                ticket.id,
                formData
            );
        }

        resetCommentForm();

        await loadCurrentTicketComments();

        showGlobalMessage(
            "success",

            editingComment
                ? "Comentario actualizado"
                : "Comentario agregado",

            editingComment
                ? "El comentario fue actualizado correctamente."
                : "El comentario fue agregado correctamente."
        );
    } catch (error) {
        console.error(
            "Error guardando comentario:",
            error
        );

        if (
            handleUnauthorized(
                error
            )
        ) {
            return;
        }

        showAlert(
            "alertaComentariosTicket",

            error.message ||
            "No fue posible guardar el comentario."
        );
    } finally {
        restoreCommentSaveButton(
            saveButton
        );
    }
}

function restoreCommentSaveButton(
    button
) {
    const editing =
        Boolean(
            ticketsState
                .comentarioEditando
                ?.id
        );

    setButtonLoading(
        button,
        false,

        editing
            ? "Guardar cambios"
            : "Guardar comentario",

        editing
            ? "fa-solid fa-floppy-disk me-2"
            : "fa-solid fa-comment-dots me-2"
    );
}

async function handleCommentAction(
    event
) {
    const editButton =
        event.target.closest(
            ".btn-editar-comentario"
        );

    if (editButton) {
        const comment =
            findCommentById(
                editButton
                    .dataset
                    .commentId
            );

        if (comment) {
            startCommentEdition(
                comment
            );
        }

        return;
    }

    const deleteButton =
        event.target.closest(
            ".btn-eliminar-comentario"
        );

    if (deleteButton) {
        const comment =
            findCommentById(
                deleteButton
                    .dataset
                    .commentId
            );

        if (comment) {
            await removeComment(
                comment
            );
        }
    }
}

function startCommentEdition(
    comment
) {
    if (
        !canCurrentUserEdit(
            comment
        )
    ) {
        showGlobalMessage(
            "warning",
            "Acceso denegado",
            "No tiene permiso para editar este comentario."
        );

        return;
    }

    ticketsState.comentarioEditando =
        comment;

    const textarea =
        document.getElementById(
            "textoComentario"
        );

    if (textarea) {
        textarea.value =
            comment.comentario ||
            "";

        textarea.focus();
    }

    const commentIdInput =
        document.getElementById(
            "comentarioId"
        );

    if (commentIdInput) {
        commentIdInput.value =
            comment.id ||
            "";
    }

    const formTitle =
        document.getElementById(
            "tituloFormularioComentario"
        );

    if (formTitle) {
        formTitle.textContent =
            "Editar comentario";
    }

    document
        .getElementById(
            "btnCancelarEdicionComentario"
        )
        ?.classList.remove(
            "d-none"
        );

    const saveButton =
        document.getElementById(
            "btnGuardarComentario"
        );

    if (saveButton) {
        saveButton.innerHTML = `
            <i class="fa-solid fa-floppy-disk me-2"></i>
            Guardar cambios
        `;
    }

    showCurrentCommentAttachment(
        comment
    );

    document
        .getElementById(
            "formComentarioTicket"
        )
        ?.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });
}

function showCurrentCommentAttachment(
    comment
) {
    const container =
        document.getElementById(
            "comentarioAdjuntoActual"
        );

    const name =
        document.getElementById(
            "comentarioAdjuntoActualNombre"
        );

    const link =
        document.getElementById(
            "comentarioAdjuntoActualEnlace"
        );

    const attachment =
        getTicketAttachment({
            archivoAdjunto:
                comment.archivoAdjunto
        });

    if (!attachment?.enlace) {
        container?.classList.add(
            "d-none"
        );

        link?.removeAttribute(
            "href"
        );

        return;
    }

    container?.classList.remove(
        "d-none"
    );

    if (name) {
        name.textContent =
            attachment.nombre ||
            "Adjunto";
    }

    if (link) {
        link.href =
            attachment.enlace;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";
    }
}

async function removeComment(
    comment
) {
    if (!checkUsuarioAdmin()) {
        showGlobalMessage(
            "warning",
            "Acceso denegado",
            "Solo los administradores pueden eliminar comentarios."
        );

        return;
    }

    const confirmed =
        await confirmCommentDeletion();

    if (!confirmed) {
        return;
    }

    const ticket =
        ticketsState
            .ticketComentariosActual;

    try {
        await deleteTicketCommentRequest(
            ticket.id,
            comment.id
        );

        if (
            ticketsState
                .comentarioEditando
                ?.id ===
            comment.id
        ) {
            resetCommentForm();
        }

        await loadCurrentTicketComments();

        showGlobalMessage(
            "success",
            "Comentario eliminado",
            "El comentario fue eliminado correctamente."
        );
    } catch (error) {
        console.error(
            "Error eliminando comentario:",
            error
        );

        if (
            handleUnauthorized(
                error
            )
        ) {
            return;
        }

        showGlobalMessage(
            "error",
            "Error",

            error.message ||
            "No fue posible eliminar el comentario."
        );
    }
}

async function confirmCommentDeletion() {
    if (window.Swal) {
        const result =
            await window.Swal.fire({
                icon:
                    "warning",

                title:
                    "¿Eliminar comentario?",

                text:
                    "El comentario y su adjunto serán eliminados.",

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí, eliminar",

                cancelButtonText:
                    "Cancelar",

                confirmButtonColor:
                    "#dc3545"
            });

        return result.isConfirmed;
    }

    return window.confirm(
        "¿Desea eliminar este comentario?"
    );
}

function canCurrentUserEdit(
    comment
) {
    if (
        checkUsuarioAdmin()
    ) {
        return true;
    }

    const userId =
        getCurrentUserId();

    return (
        userId !== "" &&
        userId ===
        String(
            comment.autorId ||
            ""
        )
    );
}

function getCurrentUserId() {
    const user =
        getUsuarioActual();

    return String(
        user?.id ||
        user?.usuarioId ||
        user?.employeeId ||
        user?.google_id ||
        user?.googleId ||
        ""
    );
}

function findCommentById(
    commentId
) {
    return (
        ticketsState
            .comentarios
            .find(
                (
                    comment
                ) => {
                    return (
                        String(
                            comment.id
                        ) ===
                        String(
                            commentId
                        )
                    );
                }
            ) ||
        null
    );
}

function resetCommentForm() {
    const form =
        document.getElementById(
            "formComentarioTicket"
        );

    form?.reset();

    form?.classList.remove(
        "was-validated"
    );

    ticketsState.comentarioEditando =
        null;

    const textarea =
        document.getElementById(
            "textoComentario"
        );

    textarea?.classList.remove(
        "is-invalid"
    );

    clearAttachmentInputs(
        "comentarioArchivoAdjunto",
        "comentarioCarpetaAdjunta"
    );

    hideAlert(
        "alertaComentariosTicket"
    );

    const commentIdInput =
        document.getElementById(
            "comentarioId"
        );

    if (commentIdInput) {
        commentIdInput.value =
            "";
    }

    const title =
        document.getElementById(
            "tituloFormularioComentario"
        );

    if (title) {
        title.textContent =
            "Agregar comentario";
    }

    document
        .getElementById(
            "btnCancelarEdicionComentario"
        )
        ?.classList.add(
            "d-none"
        );

    const saveButton =
        document.getElementById(
            "btnGuardarComentario"
        );

    if (saveButton) {
        saveButton.disabled =
            false;

        saveButton.innerHTML = `
            <i class="fa-solid fa-comment-dots me-2"></i>
            Guardar comentario
        `;
    }

    document
        .getElementById(
            "comentarioAdjuntoActual"
        )
        ?.classList.add(
            "d-none"
        );

    document
        .getElementById(
            "comentarioAdjuntoActualEnlace"
        )
        ?.removeAttribute(
            "href"
        );
}

function resetCommentsModal() {
    resetCommentForm();

    ticketsState.comentarios =
        [];

    ticketsState.ticketComentariosActual =
        null;

    const list =
        document.getElementById(
            "listaComentariosTicket"
        );

    if (list) {
        list.innerHTML =
            "";
    }

    const reference =
        document.getElementById(
            "comentariosTicketReferencia"
        );

    if (reference) {
        reference.textContent =
            "Ticket seleccionado";
    }
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