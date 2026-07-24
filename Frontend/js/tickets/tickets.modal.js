import {
    fillAreaSelects,
    fillClientSelects,
    fillEmployeeSelects,
    getEmployeeName
} from "./tickets.catalogs.js";

import {
    clearAttachmentInputs,
    fillEditTicketFile,
    fillViewTicketFile
} from "./tickets.attachments.js";

import {
    loadViewTicketComments,
    setupViewCommentEvents
} from "./tickets.comments.view.js";

import {
    ticketsState
} from "./tickets.state.js";

import {
    capitalizeText,
    formatDate,
    formatDateForInput,
    formatDateTime,
    hideAlert,
    isTicketCompleted,
    setInputValue,
    setSelectValue,
    setTextValue,
    setUsuarioIdActual
} from "./tickets.utils.js";

const COMPONENTS_BASE_URL =
    window.CRM_CONFIG
        ?.COMPONENTS_URL ||
    "/CRM/components";

const MODAL_CONFIG = [
    {
        contenedorId:
            "contenedorModalTicket",

        modalId:
            "modalAgregarTicket",

        ruta:
            "./components/Tickets/modal-add-ticket.html"
    },
    {
        contenedorId:
            "contenedorModalVerTicket",

        modalId:
            "modalVerTicket",

        ruta:
            (
                `${COMPONENTS_BASE_URL}/` +
                "Tickets/modal-view-ticket.html"
            )
    },
    {
        contenedorId:
            "contenedorModalEditarTicket",

        modalId:
            "modalEditarTicket",

        ruta:
            "./components/Tickets/modal-edit-ticket.html"
    },
    {
        contenedorId:
            "contenedorModalComentariosTicket",

        modalId:
            "modalComentariosTicket",

        ruta:
            (
                `${COMPONENTS_BASE_URL}/` +
                "Tickets/modal-comments-ticket.html"
            )
    }
];

export function prepareTicketModalsArea() {
    removeOldInlineModals();
    ensureModalContainers();
}

function removeOldInlineModals() {
    MODAL_CONFIG.forEach(
        ({
            modalId
        }) => {
            document
                .getElementById(
                    modalId
                )
                ?.remove();
        }
    );
}

function ensureModalContainers() {
    MODAL_CONFIG.forEach(
        ({
            contenedorId
        }) => {
            if (
                document.getElementById(
                    contenedorId
                )
            ) {
                return;
            }

            const container =
                document.createElement(
                    "div"
                );

            container.id =
                contenedorId;

            document.body.appendChild(
                container
            );
        }
    );
}

export async function loadModalsHtml() {
    for (
        const modal
        of MODAL_CONFIG
    ) {
        const container =
            document.getElementById(
                modal.contenedorId
            );

        if (!container) {
            throw new Error(
                `No existe el contenedor ${modal.contenedorId}.`
            );
        }

        const response =
            await fetch(
                modal.ruta,
                {
                    credentials:
                        "same-origin"
                }
            );

        if (!response.ok) {
            throw new Error(
                `No fue posible cargar ${modal.ruta}.`
            );
        }

        container.innerHTML =
            await response.text();
    }
}

export function initializeModals() {
    const BootstrapModal =
        window.bootstrap?.Modal;

    if (!BootstrapModal) {
        throw new Error(
            "Bootstrap no está disponible para inicializar los modales."
        );
    }

    const addModalElement =
        document.getElementById(
            "modalAgregarTicket"
        );

    const viewModalElement =
        document.getElementById(
            "modalVerTicket"
        );

    const editModalElement =
        document.getElementById(
            "modalEditarTicket"
        );

    const commentsModalElement =
        document.getElementById(
            "modalComentariosTicket"
        );

    if (addModalElement) {
        ticketsState.modals.agregar =
            new BootstrapModal(
                addModalElement
            );

        addModalElement.addEventListener(
            "hidden.bs.modal",
            resetTicketForm
        );
    }

    if (viewModalElement) {
        ticketsState.modals.ver =
            new BootstrapModal(
                viewModalElement
            );
    }

    if (editModalElement) {
        ticketsState.modals.editar =
            new BootstrapModal(
                editModalElement
            );

        editModalElement.addEventListener(
            "hidden.bs.modal",
            resetEditTicketForm
        );
    }

    if (commentsModalElement) {
        ticketsState.modals.comentarios =
            new BootstrapModal(
                commentsModalElement
            );
    }

    setupViewCommentEvents();
}

export function openTicketModal() {
    resetTicketForm();

    fillEmployeeSelects();
    fillClientSelects();
    fillAreaSelects();

    ticketsState
        .modals
        .agregar
        ?.show();
}

export async function openViewTicketModal(
    ticket
) {
    fillViewTicketModal(
        ticket
    );

    ticketsState
        .modals
        .ver
        ?.show();

    await loadViewTicketComments(
        ticket
    );
}

export function openEditTicketModal(
    ticket
) {
    fillEmployeeSelects();
    fillClientSelects();
    fillAreaSelects();

    fillEditTicketForm(
        ticket
    );

    ticketsState
        .modals
        .editar
        ?.show();
}

export function hideAddTicketModal() {
    ticketsState
        .modals
        .agregar
        ?.hide();
}

export function hideEditTicketModal() {
    ticketsState
        .modals
        .editar
        ?.hide();
}

function fillViewTicketModal(
    ticket
) {
    setTextValue(
        "verNumeroTicket",
        ticket.numeroTicket ||
        "-"
    );

    setTextValue(
        "verEstado",

        ticket.estadoNombre ||
        (
            isTicketCompleted(
                ticket
            )
                ? "Completado"
                : "Abierto"
        )
    );

    setTextValue(
        "verTitulo",
        ticket.titulo ||
        "-"
    );

    setTextValue(
        "verCliente",
        ticket.clienteNombre ||
        "No asignado"
    );

    setTextValue(
        "verArea",

        ticket.areaName ||
        ticket.areaNombre ||
        "No asignada"
    );

    setTextValue(
        "verEmpleadoAsignado",
        getEmployeeName(
            ticket
        )
    );

    setTextValue(
        "verPrioridad",

        capitalizeText(
            ticket.prioridad ||
            "media"
        )
    );

    setTextValue(
        "verVencimiento",

        formatDate(
            ticket.expirationDate ||
            ticket.fechaVencimiento
        )
    );

    setTextValue(
        "verCreadoPor",
        ticket.usuarioNombre ||
        "Usuario"
    );

    setTextValue(
        "verFechaCreacion",

        formatDateTime(
            ticket.createdAt
        )
    );

    setTextValue(
        "verFechaActualizacion",

        formatDateTime(
            ticket.updatedAt
        )
    );

    const description =
        document.getElementById(
            "verDescripcion"
        );

    if (description) {
        description.value =
            ticket.descripcion ||
            "Sin descripción";
    }

    fillViewTicketFile(
        ticket
    );
}

function fillEditTicketForm(
    ticket
) {
    setInputValue(
        "editarTicketId",
        ticket.id ||
        ""
    );

    setInputValue(
        "editarNumeroTicket",
        ticket.numeroTicket ||
        ""
    );

    setInputValue(
        "editarEstado",

        isTicketCompleted(
            ticket
        )
            ? "completado"
            : "abierto"
    );

    setInputValue(
        "editarTitulo",
        ticket.titulo ||
        ""
    );

    setInputValue(
        "editarDescripcion",
        ticket.descripcion ||
        ""
    );

    setInputValue(
        "editarClienteAsignado",
        ticket.clienteId ||
        ""
    );

    setInputValue(
        "editarAreaAsignada",
        ticket.areaId ||
        ""
    );

    setInputValue(
        "editarEmpleadoAsignado",

        ticket.empleadoId ||
        ticket.employeeId ||
        ""
    );

    setInputValue(
        "editarPrioridad",

        ticket.prioridad ||
        "media"
    );

    setInputValue(
        "editarFechaVencimiento",

        formatDateForInput(
            ticket.expirationDate ||
            ticket.fechaVencimiento
        )
    );

    fillEditTicketFile(
        ticket
    );

    hideAlert(
        "alertaFormularioEditarTicket"
    );

    document
        .getElementById(
            "formEditarTicket"
        )
        ?.classList.remove(
            "was-validated"
        );
}

export function resetTicketForm() {
    const form =
        document.getElementById(
            "formAgregarTicket"
        );

    form?.reset();

    form?.classList.remove(
        "was-validated"
    );

    clearAttachmentInputs(
        "archivoAdjunto",
        "carpetaAdjunta"
    );

    hideAlert(
        "alertaFormularioTicket"
    );

    setSelectValue(
        "empleadoAsignado",
        ""
    );

    setSelectValue(
        "clienteAsignado",
        ""
    );

    setSelectValue(
        "areaAsignada",
        ""
    );

    setUsuarioIdActual();
}

export function resetEditTicketForm() {
    const form =
        document.getElementById(
            "formEditarTicket"
        );

    form?.reset();

    form?.classList.remove(
        "was-validated"
    );

    clearAttachmentInputs(
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta"
    );

    hideAlert(
        "alertaFormularioEditarTicket"
    );

    document
        .getElementById(
            "editarArchivoDisponible"
        )
        ?.classList.add(
            "d-none"
        );

    document
        .getElementById(
            "editarArchivoSinAdjunto"
        )
        ?.classList.remove(
            "d-none"
        );

    document
        .getElementById(
            "editarArchivoActualEnlace"
        )
        ?.removeAttribute(
            "href"
        );

    setSelectValue(
        "editarEmpleadoAsignado",
        ""
    );

    setSelectValue(
        "editarClienteAsignado",
        ""
    );

    setSelectValue(
        "editarAreaAsignada",
        ""
    );
}