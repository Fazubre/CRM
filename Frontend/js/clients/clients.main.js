import {
    setupEvents
} from "./clients.events.js";

import {
    initializeModals,
    loadModalsHtml,
    prepareClientModalsArea
} from "./clients.modal.js";

import {
    loadClients
} from "./clients.table.js";

import {
    loadUserData,
    showGlobalMessage
} from "./clients.utils.js";

async function initializeClientsPage() {
    try {
        prepareClientModalsArea();

        await loadModalsHtml();

        initializeModals();

        loadUserData();

        setupEvents();

        await loadClients();
    } catch (error) {
        console.error(
            "Error inicializando la vista de clientes:",
            error
        );

        showGlobalMessage(
            "danger",
            error.message ||
            "No fue posible cargar la pantalla de clientes."
        );
    }
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeClientsPage,
        {
            once: true
        }
    );
} else {
    initializeClientsPage();
}