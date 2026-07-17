import {
    createTicket,
    deleteTicketRequest,
    updateTicket
} from "./tickets.api.js";

import {
    appendAttachmentToFormData,
    getAttachmentSelection,
    getAttachmentSuccessMessage,
    markAttachmentInvalid,
    validateAttachmentSelection
} from "./tickets.attachments.js";

import {
    getAreaNameById,
    getClientNameById,
    getEmployeeNameById
} from "./tickets.catalogs.js";

import {
    hideAddTicketModal,
    hideEditTicketModal
} from "./tickets.modal.js";

import {
    loadTickets
} from "./tickets.table.js";

import {
    checkUsuarioAdmin,
    getUsuarioActual,
    getValue,
    hideAlert,
    setButtonLoading,
    showAlert,
    showGlobalMessage
} from "./tickets.utils.js";

export async function submitTicketForm() {
    const form =
        document.getElementById(
            "formAgregarTicket"
        );

    const saveButton =
        document.getElementById(
            "btnGuardarTicket"
        );

    if (
        !form ||
        !saveButton
    ) {
        return;
    }

    hideFormAlert();

    const payload =
        buildTicketPayload();

    const attachmentSelection =
        getAttachmentSelection(
            "archivoAdjunto",
            "carpetaAdjunta"
        );

    const validationMessage =
        validateTicketPayload(
            payload
        );

    if (validationMessage) {
        form.classList.add(
            "was-validated"
        );

        showFormAlert(
            validationMessage
        );

        return;
    }

    const attachmentValidation =
        validateAttachmentSelection(
            attachmentSelection
        );

    if (
        !attachmentValidation.valido
    ) {
        markAttachmentInvalid(
            attachmentSelection,
            true
        );

        showFormAlert(
            attachmentValidation.mensaje
        );

        return;
    }

    markAttachmentInvalid(
        attachmentSelection,
        false
    );

    try {
        setButtonLoading(
            saveButton,
            true,
            "Guardando..."
        );

        const formData =
            buildTicketFormData(
                payload,
                attachmentSelection
            );

        await createTicket(
            formData
        );

        hideAddTicketModal();

        await loadTickets();

        showGlobalMessage(
            "success",
            "Ticket creado",

            getAttachmentSuccessMessage(
                attachmentSelection,
                false
            )
        );
    } catch (error) {
        console.error(
            "Error creando ticket:",
            error
        );

        showFormAlert(
            error.message ||
            "No fue posible crear el ticket."
        );
    } finally {
        setButtonLoading(
            saveButton,
            false,
            "Guardar Ticket",
            "fa-solid fa-floppy-disk me-2"
        );
    }
}

export async function submitEditTicketForm() {
    const form =
        document.getElementById(
            "formEditarTicket"
        );

    const updateButton =
        document.getElementById(
            "btnActualizarTicket"
        );

    const ticketId =
        getValue(
            "editarTicketId"
        );

    if (
        !form ||
        !updateButton
    ) {
        return;
    }

    hideEditFormAlert();

    if (!ticketId) {
        showEditFormAlert(
            "No se encontró el id del ticket."
        );

        return;
    }

    const payload =
        buildEditTicketPayload();

    const attachmentSelection =
        getAttachmentSelection(
            "editarArchivoAdjunto",
            "editarCarpetaAdjunta"
        );

    const validationMessage =
        validateTicketPayload(
            payload
        );

    if (validationMessage) {
        form.classList.add(
            "was-validated"
        );

        showEditFormAlert(
            validationMessage
        );

        return;
    }

    const attachmentValidation =
        validateAttachmentSelection(
            attachmentSelection
        );

    if (
        !attachmentValidation.valido
    ) {
        markAttachmentInvalid(
            attachmentSelection,
            true
        );

        showEditFormAlert(
            attachmentValidation.mensaje
        );

        return;
    }

    markAttachmentInvalid(
        attachmentSelection,
        false
    );

    try {
        setButtonLoading(
            updateButton,
            true,
            "Guardando..."
        );

        const formData =
            buildTicketFormData(
                payload,
                attachmentSelection
            );

        await updateTicket(
            ticketId,
            formData
        );

        hideEditTicketModal();

        await loadTickets();

        showGlobalMessage(
            "success",
            "Ticket actualizado",

            getAttachmentSuccessMessage(
                attachmentSelection,
                true
            )
        );
    } catch (error) {
        console.error(
            "Error actualizando ticket:",
            error
        );

        showEditFormAlert(
            error.message ||
            "No fue posible actualizar el ticket."
        );
    } finally {
        setButtonLoading(
            updateButton,
            false,
            "Guardar Cambios",
            "fa-solid fa-floppy-disk me-2"
        );
    }
}

export async function deleteTicket(
    ticket
) {
    if (!checkUsuarioAdmin()) {
        showGlobalMessage(
            "warning",
            "Acceso denegado",
            "Solo los empleados con rol admin pueden borrar tickets."
        );

        return;
    }

    const confirmed =
        await confirmTicketDeletion(
            ticket
        );

    if (!confirmed) {
        return;
    }

    try {
        await deleteTicketRequest(
            ticket.id,
            getUsuarioActual()
        );

        await loadTickets();

        showGlobalMessage(
            "success",
            "Ticket eliminado",
            "El ticket fue eliminado correctamente."
        );
    } catch (error) {
        console.error(
            "Error eliminando ticket:",
            error
        );

        showGlobalMessage(
            "error",
            "Error",

            error.message ||
            "No fue posible eliminar el ticket."
        );
    }
}

async function confirmTicketDeletion(
    ticket
) {
    const ticketReference =
        ticket.numeroTicket ||
        ticket.id ||
        "seleccionado";

    if (window.Swal) {
        const result =
            await window.Swal.fire({
                icon:
                    "warning",

                title:
                    "¿Borrar ticket?",

                text:
                    `Se eliminará el ticket ${ticketReference}.`,

                showCancelButton:
                    true,

                confirmButtonText:
                    "Sí, borrar",

                cancelButtonText:
                    "Cancelar",

                confirmButtonColor:
                    "#dc3545"
            });

        return result.isConfirmed;
    }

    return window.confirm(
        `¿Desea borrar el ticket ${ticketReference}?`
    );
}

function validateTicketPayload(
    payload
) {
    if (!payload.titulo) {
        return (
            "Debe ingresar el título del ticket."
        );
    }

    if (!payload.clienteId) {
        return (
            "Debe seleccionar un cliente."
        );
    }

    if (!payload.areaId) {
        return (
            "Debe seleccionar un área."
        );
    }

    if (!payload.empleadoId) {
        return (
            "Debe asignar un empleado."
        );
    }

    return "";
}

function buildTicketFormData(
    payload,
    attachmentSelection
) {
    const formData =
        new FormData();

    Object
        .entries(payload)
        .forEach(
            ([
                key,
                value
            ]) => {
                if (
                    value !== null &&
                    value !== undefined
                ) {
                    formData.append(
                        key,
                        String(value)
                    );
                }
            }
        );

    appendAttachmentToFormData(
        formData,
        attachmentSelection
    );

    return formData;
}

function buildTicketPayload() {
    const usuario =
        getUsuarioActual();

    const empleadoId =
        getValue(
            "empleadoAsignado"
        );

    const areaId =
        getValue(
            "areaAsignada"
        );

    const clienteSelect =
        document.getElementById(
            "clienteAsignado"
        );

    const clienteOption =
        clienteSelect
            ?.options
            ?.[
                clienteSelect
                    .selectedIndex
            ];

    const clienteId =
        clienteSelect
            ?.value
            ?.trim() ||
        clienteOption
            ?.dataset
            ?.clienteId ||
        "";

    return {
        usuarioId:
            getValue(
                "usuarioId"
            ),

        usuarioNombre:
            usuario?.nombre ||
            usuario?.correo ||
            usuario?.email ||
            "Usuario",

        titulo:
            getValue(
                "titulo"
            ),

        descripcion:
            getValue(
                "descripcion"
            ),

        prioridad:
            getValue(
                "prioridad"
            ) ||
            "media",

        fechaVencimiento:
            getValue(
                "fechaVencimiento"
            ),

        empleadoId,

        empleadoNombre:
            getEmployeeNameById(
                empleadoId
            ),

        clienteId,

        clienteNombre:
            clienteOption
                ?.dataset
                ?.clienteNombre ||
            getClientNameById(
                clienteId
            ),

        areaId,

        areaName:
            getAreaNameById(
                areaId
            )
    };
}

function buildEditTicketPayload() {
    const empleadoId =
        getValue(
            "editarEmpleadoAsignado"
        );

    const clienteId =
        getValue(
            "editarClienteAsignado"
        );

    const areaId =
        getValue(
            "editarAreaAsignada"
        );

    return {
        titulo:
            getValue(
                "editarTitulo"
            ),

        descripcion:
            getValue(
                "editarDescripcion"
            ),

        prioridad:
            getValue(
                "editarPrioridad"
            ) ||
            "media",

        estado:
            getValue(
                "editarEstado"
            ) ||
            "abierto",

        fechaVencimiento:
            getValue(
                "editarFechaVencimiento"
            ) ||
            null,

        empleadoId,

        empleadoNombre:
            getEmployeeNameById(
                empleadoId
            ),

        clienteId,

        clienteNombre:
            getClientNameById(
                clienteId
            ),

        areaId,

        areaName:
            getAreaNameById(
                areaId
            )
    };
}

function showFormAlert(
    message
) {
    showAlert(
        "alertaFormularioTicket",
        message
    );
}

function hideFormAlert() {
    hideAlert(
        "alertaFormularioTicket"
    );
}

function showEditFormAlert(
    message
) {
    showAlert(
        "alertaFormularioEditarTicket",
        message
    );
}

function hideEditFormAlert() {
    hideAlert(
        "alertaFormularioEditarTicket"
    );
}