import {
    createClient,
    deleteClient,
    updateClient
} from "./clients.api.js";

import {
    hideAddClientModal,
    hideDeleteClientModal,
    hideEditClientModal
} from "./clients.modal.js";

import {
    loadClients
} from "./clients.table.js";

import {
    getInputValue,
    getUsuarioNombreActual,
    hideAlert,
    setButtonState,
    showAlert,
    showGlobalMessage
} from "./clients.utils.js";

export async function submitAddClientForm() {
    const form =
        document.getElementById(
            "formAgregarCliente"
        );

    const btnGuardar =
        document.getElementById(
            "btnGuardarCliente"
        );

    if (
        !form ||
        !btnGuardar
    ) {
        return;
    }

    hideAddFormAlert();

    const validation =
        validateClientPayload(
            buildAddClientPayload()
        );

    if (!validation.ok) {
        form.classList.add(
            "was-validated"
        );

        showAddFormAlert(
            validation.message
        );

        return;
    }

    try {
        setButtonState(
            btnGuardar,
            true,
            "Guardando...",
            "fa-solid fa-spinner fa-spin me-2"
        );

        await createClient(
            validation.payload
        );

        hideAddClientModal();

        await loadClients();

        showGlobalMessage(
            "success",
            "El cliente fue creado correctamente."
        );
    } catch (error) {
        console.error(
            "Error creando cliente:",
            error
        );

        showAddFormAlert(
            error.message ||
            "No fue posible crear el cliente."
        );
    } finally {
        setButtonState(
            btnGuardar,
            false,
            "Guardar Cliente",
            "fa-solid fa-floppy-disk me-2"
        );
    }
}

export async function submitEditClientForm() {
    const form =
        document.getElementById(
            "formEditarCliente"
        );

    const btnActualizar =
        document.getElementById(
            "btnActualizarCliente"
        );

    const clienteId =
        document
            .getElementById(
                "editarClienteId"
            )
            ?.value ||
        "";

    if (
        !form ||
        !btnActualizar
    ) {
        return;
    }

    hideEditFormAlert();

    if (!clienteId) {
        showEditFormAlert(
            "No se encontró el id del cliente."
        );

        return;
    }

    const validation =
        validateClientPayload(
            buildEditClientPayload()
        );

    if (!validation.ok) {
        form.classList.add(
            "was-validated"
        );

        showEditFormAlert(
            validation.message
        );

        return;
    }

    try {
        setButtonState(
            btnActualizar,
            true,
            "Guardando...",
            "fa-solid fa-spinner fa-spin me-2"
        );

        await updateClient(
            clienteId,
            validation.payload
        );

        hideEditClientModal();

        await loadClients();

        showGlobalMessage(
            "success",
            "Los cambios del cliente fueron guardados correctamente."
        );
    } catch (error) {
        console.error(
            "Error actualizando cliente:",
            error
        );

        showEditFormAlert(
            error.message ||
            "No fue posible actualizar el cliente."
        );
    } finally {
        setButtonState(
            btnActualizar,
            false,
            "Guardar Cambios",
            "fa-solid fa-floppy-disk me-2"
        );
    }
}

export async function submitDeleteClient() {
    const btnEliminar =
        document.getElementById(
            "btnEliminarCliente"
        );

    const clienteId =
        document
            .getElementById(
                "eliminarClienteId"
            )
            ?.value ||
        "";

    if (!btnEliminar) {
        return;
    }

    if (!clienteId) {
        showGlobalMessage(
            "warning",
            "No se encontró el cliente a eliminar."
        );

        return;
    }

    try {
        setButtonState(
            btnEliminar,
            true,
            "Eliminando...",
            "fa-solid fa-spinner fa-spin me-2"
        );

        await deleteClient(
            clienteId
        );

        hideDeleteClientModal();

        await loadClients();

        showGlobalMessage(
            "success",
            "El cliente fue eliminado correctamente."
        );
    } catch (error) {
        console.error(
            "Error eliminando cliente:",
            error
        );

        showGlobalMessage(
            "danger",
            error.message ||
            "No fue posible eliminar el cliente."
        );
    } finally {
        setButtonState(
            btnEliminar,
            false,
            "Eliminar",
            "fa-solid fa-trash-can me-2"
        );
    }
}

function buildAddClientPayload() {
    return {
        nombre:
            getInputValue(
                "clienteNombre"
            ),

        correo:
            getInputValue(
                "clienteCorreo"
            ).toLowerCase(),

        codigo_area:
            getInputValue(
                "clienteCodigoArea"
            ),

        telefono:
            getInputValue(
                "clienteTelefono"
            ),

        empresa:
            getInputValue(
                "clienteEmpresa"
            ),

        identificacion:
            getInputValue(
                "clienteIdentificacion"
            ),

        direccion:
            getInputValue(
                "clienteDireccion"
            ),

        estado:
            getInputValue(
                "clienteEstado"
            ) ||
            "activo",

        notas:
            getInputValue(
                "clienteNotas"
            ),

        creado_por:
            getInputValue(
                "clienteCreadoPor"
            ) ||
            getUsuarioNombreActual()
    };
}

function buildEditClientPayload() {
    return {
        nombre:
            getInputValue(
                "editarClienteNombre"
            ),

        correo:
            getInputValue(
                "editarClienteCorreo"
            ).toLowerCase(),

        codigo_area:
            getInputValue(
                "editarClienteCodigoArea"
            ),

        telefono:
            getInputValue(
                "editarClienteTelefono"
            ),

        empresa:
            getInputValue(
                "editarClienteEmpresa"
            ),

        identificacion:
            getInputValue(
                "editarClienteIdentificacion"
            ),

        direccion:
            getInputValue(
                "editarClienteDireccion"
            ),

        estado:
            getInputValue(
                "editarClienteEstado"
            ) ||
            "activo",

        notas:
            getInputValue(
                "editarClienteNotas"
            )
    };
}

function validateClientPayload(
    payload
) {
    if (
        !payload.nombre ||
        !payload.correo
    ) {
        return {
            ok: false,

            message:
                "Debe ingresar al menos el nombre y el correo del cliente."
        };
    }

    const phoneValidation =
        validatePhoneData(
            payload.codigo_area,
            payload.telefono
        );

    if (!phoneValidation.ok) {
        return {
            ok: false,
            message:
                phoneValidation.mensaje
        };
    }

    return {
        ok: true,

        payload: {
            ...payload,

            codigo_area:
                phoneValidation.codigo_area,

            telefono:
                phoneValidation.telefono
        }
    };
}

function cleanPhoneNumber(
    value
) {
    return String(
        value || ""
    ).replace(
        /\D/g,
        ""
    );
}

function validatePhoneData(
    codigoArea,
    telefono
) {
    const areaLimpia =
        cleanPhoneNumber(
            codigoArea
        );

    const telefonoLimpio =
        cleanPhoneNumber(
            telefono
        );

    if (!areaLimpia) {
        return {
            ok: false,

            mensaje:
                "Debe ingresar el número de área."
        };
    }

    if (
        areaLimpia.length < 1 ||
        areaLimpia.length > 4
    ) {
        return {
            ok: false,

            mensaje:
                "El número de área debe tener entre 1 y 4 dígitos."
        };
    }

    if (!telefonoLimpio) {
        return {
            ok: false,

            mensaje:
                "Debe ingresar el número de teléfono."
        };
    }

    if (
        telefonoLimpio.length !== 8
    ) {
        return {
            ok: false,

            mensaje:
                "El número de teléfono debe tener exactamente 8 dígitos."
        };
    }

    return {
        ok: true,

        codigo_area:
            areaLimpia,

        telefono:
            telefonoLimpio
    };
}

function showAddFormAlert(
    message
) {
    showAlert(
        "alertaFormularioCliente",
        message
    );
}

function hideAddFormAlert() {
    hideAlert(
        "alertaFormularioCliente"
    );
}

function showEditFormAlert(
    message
) {
    showAlert(
        "alertaFormularioEditarCliente",
        message
    );
}

function hideEditFormAlert() {
    hideAlert(
        "alertaFormularioEditarCliente"
    );
}