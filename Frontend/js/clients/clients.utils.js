export function loadUserData() {
    const nombreUsuario =
        document.getElementById(
            "nombreUsuario"
        );

    if (!nombreUsuario) {
        return;
    }

    const usuario =
        getUsuarioActual();

    nombreUsuario.textContent =
        usuario?.nombre ||
        usuario?.correo ||
        "Usuario";
}

export function getUsuarioActual() {
    const usuarioGuardado =
        localStorage.getItem(
            "usuarioCRM"
        );

    if (!usuarioGuardado) {
        return null;
    }

    try {
        return JSON.parse(
            usuarioGuardado
        );
    } catch (error) {
        console.error(
            "Error obteniendo usuario actual:",
            error
        );

        return null;
    }
}

export function getUsuarioNombreActual() {
    const usuario =
        getUsuarioActual();

    if (!usuario) {
        return "Usuario";
    }

    return (
        usuario.nombre ||
        usuario.correo ||
        usuario.google_id ||
        "Usuario"
    );
}

export function getClientId(cliente) {
    return (
        cliente?.cliente_id ||
        cliente?.id ||
        cliente?.client_id ||
        cliente?.clientId ||
        ""
    );
}

export function parseDateValue(
    valor
) {
    if (!valor) {
        return null;
    }

    let fecha = null;

    if (
        typeof valor === "object" &&
        typeof valor.seconds === "number"
    ) {
        fecha =
            new Date(
                valor.seconds * 1000
            );
    } else if (
        typeof valor === "object" &&
        typeof valor._seconds === "number"
    ) {
        fecha =
            new Date(
                valor._seconds * 1000
            );
    } else if (
        typeof valor === "object" &&
        typeof valor.toDate === "function"
    ) {
        fecha =
            valor.toDate();
    } else if (
        valor instanceof Date
    ) {
        fecha = valor;
    } else {
        fecha =
            new Date(valor);
    }

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return null;
    }

    return fecha;
}

export function formatDateTime(
    valor
) {
    const fecha =
        parseDateValue(valor);

    if (!fecha) {
        return "Sin fecha";
    }

    return fecha.toLocaleString(
        "es-CR"
    );
}

export function formatPhone(
    codigoArea,
    telefono
) {
    const area =
        String(
            codigoArea || ""
        ).trim();

    const number =
        String(
            telefono || ""
        ).trim();

    if (!number) {
        return "-";
    }

    return area
        ? `+${area} ${number}`
        : number;
}

export function setTextValue(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "-"
            : String(value);
}

export function setInputValue(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.value =
        value ?? "";
}

export function getInputValue(
    id
) {
    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return String(
        element.value || ""
    ).trim();
}

export function capitalizeText(
    text
) {
    const value =
        String(
            text || ""
        ).trim();

    if (!value) {
        return "-";
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}

export function showAlert(
    id,
    message
) {
    const alerta =
        document.getElementById(id);

    if (!alerta) {
        return;
    }

    alerta.textContent =
        message;

    alerta.classList.remove(
        "d-none"
    );
}

export function hideAlert(
    id
) {
    const alerta =
        document.getElementById(id);

    if (!alerta) {
        return;
    }

    alerta.textContent = "";

    alerta.classList.add(
        "d-none"
    );
}

export function setButtonState(
    button,
    disabled,
    text,
    iconClass
) {
    if (!button) {
        return;
    }

    button.disabled =
        disabled;

    button.innerHTML = `
        <i class="${escapeHtml(iconClass)}"></i>
        ${escapeHtml(text)}
    `;
}

export function showGlobalMessage(
    type,
    message
) {
    if (window.Swal) {
        const icon =
            type === "danger"
                ? "error"
                : type;

        window.Swal.fire({
            icon,
            title:
                buildMessageTitle(type),
            text:
                message
        });

        return;
    }

    const alertContainer =
        document.getElementById(
            "alertContainer"
        );

    if (!alertContainer) {
        window.alert(message);
        return;
    }

    const bootstrapType =
        normalizeBootstrapAlertType(
            type
        );

    alertContainer.innerHTML = `
        <div
            class="alert alert-${bootstrapType} alert-dismissible fade show"
            role="alert"
        >
            ${escapeHtml(message)}

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Cerrar"
            ></button>
        </div>
    `;

    window.setTimeout(
        () => {
            alertContainer.innerHTML =
                "";
        },
        5000
    );
}

function buildMessageTitle(
    type
) {
    if (type === "success") {
        return "Éxito";
    }

    if (type === "warning") {
        return "Atención";
    }

    if (type === "danger") {
        return "Error";
    }

    return "Información";
}

function normalizeBootstrapAlertType(
    type
) {
    if (
        [
            "danger",
            "success",
            "warning",
            "info"
        ].includes(type)
    ) {
        return type;
    }

    return "info";
}

export function escapeHtml(
    texto
) {
    return String(
        texto ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#39;"
        );
}