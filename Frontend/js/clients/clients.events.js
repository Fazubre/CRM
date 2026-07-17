import {
    submitAddClientForm,
    submitDeleteClient,
    submitEditClientForm
} from "./clients.form.js";

import {
    openAddClientModal,
    openDeleteClientModal,
    openEditClientModal,
    openViewClientModal
} from "./clients.modal.js";

import {
    findClientById,
    loadClients
} from "./clients.table.js";

import {
    showGlobalMessage
} from "./clients.utils.js";

export function setupEvents() {
    setupPageEvents();
    setupFormEvents();
    setupTableEvents();
}

function setupPageEvents() {
    document
        .getElementById(
            "btnNuevoCliente"
        )
        ?.addEventListener(
            "click",
            openAddClientModal
        );

    document
        .getElementById(
            "btnRecargarClientes"
        )
        ?.addEventListener(
            "click",
            async () => {
                await loadClients();
            }
        );
}

function setupFormEvents() {
    document
        .getElementById(
            "formAgregarCliente"
        )
        ?.addEventListener(
            "submit",
            async (event) => {
                event.preventDefault();

                await submitAddClientForm();
            }
        );

    document
        .getElementById(
            "formEditarCliente"
        )
        ?.addEventListener(
            "submit",
            async (event) => {
                event.preventDefault();

                await submitEditClientForm();
            }
        );

    document
        .getElementById(
            "btnEliminarCliente"
        )
        ?.addEventListener(
            "click",
            async () => {
                await submitDeleteClient();
            }
        );
}

function setupTableEvents() {
    document.addEventListener(
        "click",
        handleTableAction
    );
}

function handleTableAction(
    event
) {
    const actionButton =
        event.target.closest(
            ".btn-ver-cliente, " +
            ".btn-editar-cliente, " +
            ".btn-eliminar-cliente"
        );

    if (!actionButton) {
        return;
    }

    const clienteId =
        actionButton.dataset.id;

    const cliente =
        findClientById(
            clienteId
        );

    if (!cliente) {
        showGlobalMessage(
            "warning",
            "No fue posible encontrar el cliente seleccionado."
        );

        return;
    }

    if (
        actionButton.classList.contains(
            "btn-ver-cliente"
        )
    ) {
        openViewClientModal(
            cliente
        );

        return;
    }

    if (
        actionButton.classList.contains(
            "btn-editar-cliente"
        )
    ) {
        openEditClientModal(
            cliente
        );

        return;
    }

    if (
        actionButton.classList.contains(
            "btn-eliminar-cliente"
        )
    ) {
        openDeleteClientModal(
            cliente
        );
    }
}