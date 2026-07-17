import {
    loadCatalogs
} from "./tickets.catalogs.js";

import {
    setupEvents
} from "./tickets.events.js";

import {
    initializeModals,
    loadModalsHtml,
    prepareTicketModalsArea
} from "./tickets.modal.js";

import {
    loadTickets
} from "./tickets.table.js";

import {
    loadUserData,
    showGlobalMessage
} from "./tickets.utils.js";

async function initializeTicketsPage() {
    try {
        prepareTicketModalsArea();

        await loadModalsHtml();

        initializeModals();

        loadUserData();

        setupEvents();

        await loadCatalogs();

        await loadTickets();
    } catch (error) {
        console.error(
            "Error inicializando la vista de tickets:",
            error
        );

        showGlobalMessage(
            "error",
            "Error inicial",

            error.message ||
            "No fue posible cargar la pantalla de tickets."
        );
    }
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeTicketsPage,
        {
            once: true
        }
    );
} else {
    initializeTicketsPage();
}