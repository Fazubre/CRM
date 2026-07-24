import {
    setupAttachmentExclusivity
} from "./tickets.attachments.js";

import {
    loadCatalogs
} from "./tickets.catalogs.js";

import {
    openCommentsModal,
    setupCommentEvents
} from "./tickets.comments.js";

import {
    deleteTicket,
    submitEditTicketForm,
    submitTicketForm
} from "./tickets.form.js";

import {
    openEditTicketModal,
    openTicketModal,
    openViewTicketModal
} from "./tickets.modal.js";

import {
    findTicketById,
    loadTickets
} from "./tickets.table.js";

import {
    hideAlert,
    showGlobalMessage
} from "./tickets.utils.js";

export function setupEvents() {
    setupPageEvents();
    setupFormEvents();
    setupTableEvents();
    setupFormChangeEvents();
    setupAttachmentExclusivity();
    setupCommentEvents();
}

function setupPageEvents() {
    document
        .getElementById(
            "btnNuevoTicket"
        )
        ?.addEventListener(
            "click",
            openTicketModal
        );

    document
        .getElementById(
            "btnRecargarTickets"
        )
        ?.addEventListener(
            "click",
            async () => {
                await loadCatalogs();
                await loadTickets();
            }
        );
}

function setupFormEvents() {
    document
        .getElementById(
            "formAgregarTicket"
        )
        ?.addEventListener(
            "submit",
            async (
                event
            ) => {
                event.preventDefault();

                await submitTicketForm();
            }
        );

    document
        .getElementById(
            "formEditarTicket"
        )
        ?.addEventListener(
            "submit",
            async (
                event
            ) => {
                event.preventDefault();

                await submitEditTicketForm();
            }
        );
}

function setupTableEvents() {
    document.addEventListener(
        "click",
        handleTableAction
    );
}

async function handleTableAction(
    event
) {
    const actionButton =
        event.target.closest(
            (
                ".btn-ver-ticket, " +
                ".btn-comentarios-ticket, " +
                ".btn-editar-ticket, " +
                ".btn-eliminar-ticket"
            )
        );

    if (!actionButton) {
        return;
    }

    const ticket =
        findTicketById(
            actionButton.dataset.id
        );

    if (!ticket) {
        showTicketNotFound();

        return;
    }

    if (
        actionButton.classList.contains(
            "btn-ver-ticket"
        )
    ) {
        openViewTicketModal(
            ticket
        );

        return;
    }

    if (
        actionButton.classList.contains(
            "btn-comentarios-ticket"
        )
    ) {
        await openCommentsModal(
            ticket
        );

        return;
    }

    if (
        actionButton.classList.contains(
            "btn-editar-ticket"
        )
    ) {
        openEditTicketModal(
            ticket
        );

        return;
    }

    if (
        actionButton.classList.contains(
            "btn-eliminar-ticket"
        )
    ) {
        await deleteTicket(
            ticket
        );
    }
}

export function setupFormChangeEvents() {
    const fields = [
        "titulo",
        "clienteAsignado",
        "areaAsignada",
        "empleadoAsignado",
        "fechaVencimiento",
        "archivoAdjunto",
        "carpetaAdjunta",

        "editarTitulo",
        "editarClienteAsignado",
        "editarAreaAsignada",
        "editarEmpleadoAsignado",
        "editarFechaVencimiento",
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta",

        "textoComentario",
        "comentarioArchivoAdjunto",
        "comentarioCarpetaAdjunta"
    ];

    fields.forEach(
        (
            id
        ) => {
            const field =
                document.getElementById(
                    id
                );

            if (!field) {
                return;
            }

            const clearValidation =
                () => {
                    hideAlert(
                        "alertaFormularioTicket"
                    );

                    hideAlert(
                        "alertaFormularioEditarTicket"
                    );

                    hideAlert(
                        "alertaComentariosTicket"
                    );

                    field.classList.remove(
                        "is-invalid"
                    );
                };

            field.addEventListener(
                "input",
                clearValidation
            );

            field.addEventListener(
                "change",
                clearValidation
            );
        }
    );
}

function showTicketNotFound() {
    showGlobalMessage(
        "warning",
        "Ticket no encontrado",
        "No fue posible encontrar el ticket seleccionado."
    );
}