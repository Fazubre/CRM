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
        usuario?.email ||
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

export function getUsuarioIdActual() {
    const usuario =
        getUsuarioActual();

    return (
        usuario?.id ||
        usuario?.usuarioId ||
        usuario?.employeeId ||
        usuario?.google_id ||
        usuario?.googleId ||
        ""
    );
}

export function getRolUsuarioActual() {
    const usuario =
        getUsuarioActual();

    if (!usuario) {
        return "";
    }

    if (
        Array.isArray(
            usuario.roles
        )
    ) {
        const rolAdmin =
            usuario.roles
                .map((rol) => {
                    return String(
                        rol || ""
                    )
                        .trim()
                        .toLowerCase();
                })
                .find((rol) => {
                    return rol === "admin";
                });

        return rolAdmin || "";
    }

    return String(
        usuario.rol ||
        usuario.role ||
        usuario.tipoRol ||
        usuario.tipo_usuario ||
        ""
    )
        .trim()
        .toLowerCase();
}

export function checkUsuarioAdmin() {
    return (
        getRolUsuarioActual() ===
        "admin"
    );
}

export function setUsuarioIdActual() {
    setInputValue(
        "usuarioId",
        getUsuarioIdActual()
    );
}

export function getValue(id) {
    return String(
        document
            .getElementById(id)
            ?.value ||
        ""
    ).trim();
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

export function setSelectValue(
    id,
    value
) {
    setInputValue(
        id,
        value || ""
    );
}

export function setSelectOptions(
    id,
    html
) {
    const select =
        document.getElementById(id);

    if (select) {
        select.innerHTML =
            html;
    }
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
        value
            .charAt(0)
            .toUpperCase() +
        value.slice(1)
    );
}

export function parseDateValue(
    valor
) {
    if (!valor) {
        return null;
    }

    let fecha;

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
        fecha =
            valor;
    } else {
        fecha =
            new Date(valor);
    }

    return Number.isNaN(
        fecha.getTime()
    )
        ? null
        : fecha;
}

export function formatDate(
    valor
) {
    const fecha =
        parseDateValue(valor);

    return fecha
        ? fecha.toLocaleDateString(
            "es-CR"
        )
        : "Sin fecha";
}

export function formatDateTime(
    valor
) {
    const fecha =
        parseDateValue(valor);

    return fecha
        ? fecha.toLocaleString(
            "es-CR"
        )
        : "Sin fecha";
}

export function formatDateForInput(
    valor
) {
    const fecha =
        parseDateValue(valor);

    if (!fecha) {
        return "";
    }

    const year =
        fecha.getFullYear();

    const month =
        String(
            fecha.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            fecha.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}

export function isTicketCompleted(
    ticket
) {
    if (!ticket) {
        return false;
    }

    if (
        ticket.isCompleted ===
        true
    ) {
        return true;
    }

    const estado =
        String(
            ticket.estadoNombre ||
            ticket.estado ||
            ""
        )
            .trim()
            .toLowerCase();

    return (
        estado === "completado" ||
        estado === "completa"
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

export function hideAlert(id) {
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

export function setButtonLoading(
    button,
    loading,
    text,
    iconClass =
        "fa-solid fa-spinner fa-spin me-2"
) {
    if (!button) {
        return;
    }

    button.disabled =
        loading;

    button.innerHTML = `
        <i class="${escapeHtml(iconClass)}"></i>
        ${escapeHtml(text)}
    `;
}

export function showGlobalMessage(
    type,
    title,
    message
) {
    if (window.Swal) {
        window.Swal.fire({
            icon:
                type === "danger"
                    ? "error"
                    : type,

            title,
            text: message
        });

        return;
    }

    window.alert(
        `${title}: ${message}`
    );
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

export function convertirLinksClickeables(
    texto
) {
    const patronUrl =
        /(https?:\/\/[^\s<]+)/gi;

    return String(
        texto ?? ""
    )
        .split(
            patronUrl
        )
        .map((fragmento) => {
            if (
                !/^https?:\/\//i.test(
                    fragmento
                )
            ) {
                return escapeHtml(
                    fragmento
                );
            }

            let enlace =
                fragmento;

            let caracteresFinales =
                "";

            while (
                /[),.;!?]$/.test(
                    enlace
                )
            ) {
                caracteresFinales =
                    enlace.slice(-1) +
                    caracteresFinales;

                enlace =
                    enlace.slice(
                        0,
                        -1
                    );
            }

            const enlaceSeguro =
                escapeHtml(
                    enlace
                );

            return `
                <a
                    href="${enlaceSeguro}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-primary text-decoration-underline"
                >
                    ${enlaceSeguro}
                </a>${escapeHtml(caracteresFinales)}
            `;
        })
        .join("");
}