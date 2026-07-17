import {
    clientsState
} from "./clients.state.js";

import {
    capitalizeText,
    formatDateTime,
    getClientId,
    getUsuarioNombreActual,
    hideAlert,
    setInputValue,
    setTextValue
} from "./clients.utils.js";

const MODAL_CONFIG = [
    {
        contenedorId:
            "contenedorModalAgregarCliente",

        modalId:
            "modalAgregarCliente",

        ruta:
            "./components/Clients/modal-add-client.html"
    },
    {
        contenedorId:
            "contenedorModalEditarCliente",

        modalId:
            "modalEditarCliente",

        ruta:
            "./components/Clients/modal-edit-client.html"
    },
    {
        contenedorId:
            "contenedorModalVerCliente",

        modalId:
            "modalVerCliente",

        ruta:
            "./components/Clients/modal-view-client.html"
    },
    {
        contenedorId:
            "contenedorModalEliminarCliente",

        modalId:
            "modalEliminarCliente",

        ruta:
            "./components/Clients/modal-elimin-client.html"
    }
];

export function prepareClientModalsArea() {
    removeOldInlineModals();
    ensureModalContainers();
}

function removeOldInlineModals() {
    const oldModalIds = [
        "modalCliente",
        "modalAgregarCliente",
        "modalEditarCliente",
        "modalVerCliente",
        "modalEliminarCliente"
    ];

    oldModalIds.forEach(
        (id) => {
            document
                .getElementById(id)
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
            await fetch(modal.ruta);

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

    const modalAgregarElement =
        document.getElementById(
            "modalAgregarCliente"
        );

    const modalEditarElement =
        document.getElementById(
            "modalEditarCliente"
        );

    const modalVerElement =
        document.getElementById(
            "modalVerCliente"
        );

    const modalEliminarElement =
        document.getElementById(
            "modalEliminarCliente"
        );

    if (modalAgregarElement) {
        clientsState.modals.agregar =
            new BootstrapModal(
                modalAgregarElement
            );

        modalAgregarElement.addEventListener(
            "hidden.bs.modal",
            resetAddClientForm
        );
    }

    if (modalEditarElement) {
        clientsState.modals.editar =
            new BootstrapModal(
                modalEditarElement
            );

        modalEditarElement.addEventListener(
            "hidden.bs.modal",
            resetEditClientForm
        );
    }

    if (modalVerElement) {
        clientsState.modals.ver =
            new BootstrapModal(
                modalVerElement
            );
    }

    if (modalEliminarElement) {
        clientsState.modals.eliminar =
            new BootstrapModal(
                modalEliminarElement
            );

        modalEliminarElement.addEventListener(
            "hidden.bs.modal",
            resetDeleteClientModal
        );
    }
}

export function openAddClientModal() {
    resetAddClientForm();
    setClienteCreadoPorActual();

    clientsState
        .modals
        .agregar
        ?.show();
}

export function openViewClientModal(
    cliente
) {
    fillViewClientModal(
        cliente
    );

    clientsState
        .modals
        .ver
        ?.show();
}

export function openEditClientModal(
    cliente
) {
    fillEditClientForm(
        cliente
    );

    clientsState
        .modals
        .editar
        ?.show();
}

export function openDeleteClientModal(
    cliente
) {
    setInputValue(
        "eliminarClienteId",
        getClientId(cliente)
    );

    setTextValue(
        "nombreClienteEliminar",
        cliente.nombre ||
        "Cliente"
    );

    clientsState
        .modals
        .eliminar
        ?.show();
}

export function hideAddClientModal() {
    clientsState
        .modals
        .agregar
        ?.hide();
}

export function hideEditClientModal() {
    clientsState
        .modals
        .editar
        ?.hide();
}

export function hideDeleteClientModal() {
    clientsState
        .modals
        .eliminar
        ?.hide();
}

function fillViewClientModal(
    cliente
) {
    setTextValue(
        "verClienteId",
        getClientId(cliente)
    );

    setTextValue(
        "verClienteEstado",
        capitalizeText(
            cliente.estado ||
            "activo"
        )
    );

    setTextValue(
        "verClienteNombre",
        cliente.nombre ||
        "-"
    );

    setTextValue(
        "verClienteCorreo",
        cliente.correo ||
        "-"
    );

    setTextValue(
        "verClienteTelefono",
        cliente.telefono ||
        "-"
    );

    setTextValue(
        "verClienteEmpresa",
        cliente.empresa ||
        "-"
    );

    setTextValue(
        "verClienteIdentificacion",
        cliente.identificacion ||
        "-"
    );

    setTextValue(
        "verClienteDireccion",
        cliente.direccion ||
        "-"
    );

    setTextValue(
        "verClienteCreadoPor",
        cliente.creado_por ||
        "-"
    );

    setTextValue(
        "verClienteFechaCreacion",
        formatDateTime(
            cliente.fecha_creacion ||
            cliente.createdAt
        )
    );

    setTextValue(
        "verClienteFechaActualizacion",
        formatDateTime(
            cliente.fecha_actualizacion ||
            cliente.updatedAt
        )
    );

    const notas =
        document.getElementById(
            "verClienteNotas"
        );

    if (notas) {
        notas.value =
            cliente.notas ||
            "";
    }
}

function fillEditClientForm(
    cliente
) {
    const clienteId =
        getClientId(cliente);

    setInputValue(
        "editarClienteId",
        clienteId
    );

    setInputValue(
        "editarClienteCodigo",
        clienteId
    );

    setInputValue(
        "editarClienteEstado",
        cliente.estado ||
        "activo"
    );

    setInputValue(
        "editarClienteNombre",
        cliente.nombre ||
        ""
    );

    setInputValue(
        "editarClienteCorreo",
        cliente.correo ||
        ""
    );

    setInputValue(
        "editarClienteCodigoArea",
        cliente.codigo_area ||
        ""
    );

    setInputValue(
        "editarClienteTelefono",
        cliente.telefono ||
        ""
    );

    setInputValue(
        "editarClienteEmpresa",
        cliente.empresa ||
        ""
    );

    setInputValue(
        "editarClienteIdentificacion",
        cliente.identificacion ||
        ""
    );

    setInputValue(
        "editarClienteDireccion",
        cliente.direccion ||
        ""
    );

    setInputValue(
        "editarClienteNotas",
        cliente.notas ||
        ""
    );

    hideAlert(
        "alertaFormularioEditarCliente"
    );

    document
        .getElementById(
            "formEditarCliente"
        )
        ?.classList.remove(
            "was-validated"
        );
}

export function resetAddClientForm() {
    const form =
        document.getElementById(
            "formAgregarCliente"
        );

    if (form) {
        form.reset();

        form.classList.remove(
            "was-validated"
        );
    }

    hideAlert(
        "alertaFormularioCliente"
    );

    setClienteCreadoPorActual();

    setInputValue(
        "clienteEstado",
        "activo"
    );
}

export function resetEditClientForm() {
    const form =
        document.getElementById(
            "formEditarCliente"
        );

    if (form) {
        form.reset();

        form.classList.remove(
            "was-validated"
        );
    }

    hideAlert(
        "alertaFormularioEditarCliente"
    );
}

export function resetDeleteClientModal() {
    setInputValue(
        "eliminarClienteId",
        ""
    );

    setTextValue(
        "nombreClienteEliminar",
        "-"
    );
}

function setClienteCreadoPorActual() {
    setInputValue(
        "clienteCreadoPor",
        getUsuarioNombreActual()
    );
}