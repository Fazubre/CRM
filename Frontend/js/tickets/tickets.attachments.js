import {
    ALLOWED_FILE_EXTENSIONS,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE,
    MAX_FOLDER_FILES,
    MAX_FOLDER_TOTAL_SIZE
} from "./tickets.state.js";

export function setupAttachmentExclusivity() {
    setupAttachmentPair(
        "archivoAdjunto",
        "carpetaAdjunta"
    );

    setupAttachmentPair(
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta"
    );
}

function setupAttachmentPair(
    archivoInputId,
    carpetaInputId
) {
    const archivoInput =
        document.getElementById(
            archivoInputId
        );

    const carpetaInput =
        document.getElementById(
            carpetaInputId
        );

    archivoInput?.addEventListener(
        "change",
        () => {
            if (
                archivoInput.files?.length &&
                carpetaInput
            ) {
                carpetaInput.value =
                    "";

                carpetaInput.classList.remove(
                    "is-invalid"
                );
            }
        }
    );

    carpetaInput?.addEventListener(
        "change",
        () => {
            if (
                carpetaInput.files?.length &&
                archivoInput
            ) {
                archivoInput.value =
                    "";

                archivoInput.classList.remove(
                    "is-invalid"
                );
            }
        }
    );
}

export function clearAttachmentInputs(
    archivoInputId,
    carpetaInputId
) {
    [
        archivoInputId,
        carpetaInputId
    ].forEach((id) => {
        const input =
            document.getElementById(id);

        if (input) {
            input.value = "";

            input.classList.remove(
                "is-invalid"
            );
        }
    });
}

export function getTicketAttachment(
    ticket
) {
    if (!ticket) {
        return null;
    }

    const attachment =
        ticket.archivoAdjunto ||
        ticket.archivo ||
        ticket.attachment ||
        ticket.file ||
        null;

    if (!attachment) {
        return null;
    }

    if (
        typeof attachment ===
        "string"
    ) {
        return {
            id: "",

            tipoAdjunto:
                "archivo",

            nombre:
                "Archivo adjunto",

            tipo: "",

            cantidadArchivos:
                0,

            tamano:
                0,

            enlace:
                attachment
        };
    }

    const tipo =
        attachment.tipo ||
        attachment.mimeType ||
        attachment.mimetype ||
        "";

    return {
        id:
            attachment.id ||
            attachment.fileId ||
            attachment.googleDriveId ||
            "",

        tipoAdjunto:
            attachment.tipoAdjunto ||
            (
                tipo ===
                "application/vnd.google-apps.folder"
                    ? "carpeta"
                    : "archivo"
            ),

        nombre:
            attachment.nombre ||
            attachment.name ||
            attachment.originalName ||
            attachment.originalname ||
            "Adjunto",

        tipo,

        cantidadArchivos:
            Number(
                attachment.cantidadArchivos ||
                0
            ),

        tamano:
            Number(
                attachment.tamano ||
                attachment.size ||
                0
            ),

        enlace:
            attachment.webViewLink ||
            attachment.enlaceVisualizacion ||
            attachment.url ||
            attachment.link ||
            attachment.enlace ||
            ""
    };
}

export function getAttachmentDescription(
    attachment
) {
    if (!attachment) {
        return "Sin adjunto";
    }

    if (
        attachment.tipoAdjunto ===
        "carpeta"
    ) {
        const cantidad =
            attachment.cantidadArchivos ||
            0;

        return cantidad > 0
            ? `Carpeta de Google Drive · ${cantidad} archivo${cantidad === 1 ? "" : "s"}`
            : "Carpeta de Google Drive";
    }

    return (
        attachment.tipo ||
        "Archivo de Google Drive"
    );
}

export function fillViewTicketFile(
    ticket
) {
    fillAttachmentDisplay({
        ticket,

        disponibleId:
            "verArchivoDisponible",

        sinAdjuntoId:
            "verArchivoSinAdjunto",

        nombreId:
            "verArchivoNombre",

        tipoId:
            "verArchivoTipo",

        enlaceId:
            "verArchivoEnlace"
    });
}

export function fillEditTicketFile(
    ticket
) {
    clearAttachmentInputs(
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta"
    );

    fillAttachmentDisplay({
        ticket,

        disponibleId:
            "editarArchivoDisponible",

        sinAdjuntoId:
            "editarArchivoSinAdjunto",

        nombreId:
            "editarArchivoActualNombre",

        tipoId:
            "editarArchivoActualTipo",

        enlaceId:
            "editarArchivoActualEnlace"
    });
}

export function fillAttachmentDisplay({
    ticket,
    disponibleId,
    sinAdjuntoId,
    nombreId,
    tipoId,
    enlaceId
}) {
    const disponible =
        document.getElementById(
            disponibleId
        );

    const sinAdjunto =
        document.getElementById(
            sinAdjuntoId
        );

    const nombre =
        document.getElementById(
            nombreId
        );

    const tipo =
        document.getElementById(
            tipoId
        );

    const enlace =
        document.getElementById(
            enlaceId
        );

    const attachment =
        getTicketAttachment(
            ticket
        );

    if (!attachment?.enlace) {
        disponible?.classList.add(
            "d-none"
        );

        sinAdjunto?.classList.remove(
            "d-none"
        );

        enlace?.removeAttribute(
            "href"
        );

        if (nombre) {
            nombre.textContent =
                "";
        }

        if (tipo) {
            tipo.textContent =
                "";
        }

        return;
    }

    disponible?.classList.remove(
        "d-none"
    );

    sinAdjunto?.classList.add(
        "d-none"
    );

    if (nombre) {
        nombre.textContent =
            attachment.nombre;
    }

    if (tipo) {
        tipo.textContent =
            getAttachmentDescription(
                attachment
            );
    }

    if (enlace) {
        enlace.href =
            attachment.enlace;

        enlace.target =
            "_blank";

        enlace.rel =
            "noopener noreferrer";

        enlace.innerHTML =
            attachment.tipoAdjunto ===
            "carpeta"
                ? `
                    <i class="fa-solid fa-folder-open me-2"></i>
                    Abrir carpeta
                `
                : `
                    <i class="fa-solid fa-eye me-2"></i>
                    Ver archivo
                `;
    }
}

export function getAttachmentSelection(
    archivoInputId,
    carpetaInputId
) {
    const archivoInput =
        document.getElementById(
            archivoInputId
        );

    const carpetaInput =
        document.getElementById(
            carpetaInputId
        );

    return {
        archivo:
            archivoInput
                ?.files
                ?.[0] ||
            null,

        archivosCarpeta:
            Array.from(
                carpetaInput
                    ?.files ||
                []
            ),

        archivoInput,
        carpetaInput
    };
}

export function validateAttachmentSelection(
    selection
) {
    const {
        archivo,
        archivosCarpeta
    } = selection;

    if (
        archivo &&
        archivosCarpeta.length > 0
    ) {
        return {
            valido: false,

            mensaje:
                "Seleccione un archivo individual o una carpeta, no ambos."
        };
    }

    if (archivo) {
        return validateTicketFile(
            archivo
        );
    }

    if (
        archivosCarpeta.length ===
        0
    ) {
        return {
            valido: true,
            mensaje: ""
        };
    }

    if (
        archivosCarpeta.length >
        MAX_FOLDER_FILES
    ) {
        return {
            valido: false,

            mensaje:
                `La carpeta no puede contener más de ${MAX_FOLDER_FILES} archivos.`
        };
    }

    let totalSize =
        0;

    for (
        const folderFile
        of archivosCarpeta
    ) {
        const validation =
            validateTicketFile(
                folderFile
            );

        if (!validation.valido) {
            return {
                valido: false,

                mensaje:
                    `${folderFile.name}: ${validation.mensaje}`
            };
        }

        totalSize +=
            folderFile.size;
    }

    if (
        totalSize >
        MAX_FOLDER_TOTAL_SIZE
    ) {
        return {
            valido: false,

            mensaje:
                "La carpeta no puede superar los 100 MB en total."
        };
    }

    return {
        valido: true,
        mensaje: ""
    };
}

function validateTicketFile(
    file
) {
    if (!file) {
        return {
            valido: true,
            mensaje: ""
        };
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        return {
            valido: false,

            mensaje:
                "Cada archivo no puede superar los 10 MB."
        };
    }

    const fileName =
        String(
            file.name ||
            ""
        ).toLowerCase();

    const extensionAllowed =
        ALLOWED_FILE_EXTENSIONS.some(
            (extension) => {
                return fileName.endsWith(
                    extension
                );
            }
        );

    const typeAllowed =
        ALLOWED_FILE_TYPES.includes(
            file.type
        );

    if (
        !typeAllowed &&
        !extensionAllowed
    ) {
        return {
            valido: false,

            mensaje:
                "El formato del archivo seleccionado no está permitido."
        };
    }

    return {
        valido: true,
        mensaje: ""
    };
}

export function markAttachmentInvalid(
    selection,
    invalid
) {
    selection
        .archivoInput
        ?.classList
        .toggle(
            "is-invalid",
            invalid
        );

    selection
        .carpetaInput
        ?.classList
        .toggle(
            "is-invalid",
            invalid
        );
}

export function appendAttachmentToFormData(
    formData,
    selection
) {
    if (selection.archivo) {
        formData.append(
            "archivo",
            selection.archivo
        );

        return;
    }

    if (
        selection
            .archivosCarpeta
            .length ===
        0
    ) {
        return;
    }

    const relativePaths =
        selection
            .archivosCarpeta
            .map((file) => {
                return (
                    file.webkitRelativePath ||
                    file.name
                );
            });

    selection
        .archivosCarpeta
        .forEach((file) => {
            formData.append(
                "carpetaArchivos",
                file,
                file.name
            );
        });

    formData.append(
        "rutasCarpeta",
        JSON.stringify(
            relativePaths
        )
    );
}

export function getAttachmentSuccessMessage(
    selection,
    isEdit
) {
    if (selection.archivo) {
        return isEdit
            ? "El ticket y el archivo fueron actualizados correctamente."
            : "El ticket y el archivo fueron guardados correctamente.";
    }

    if (
        selection
            .archivosCarpeta
            .length >
        0
    ) {
        return isEdit
            ? "El ticket y la carpeta fueron actualizados correctamente."
            : "El ticket y la carpeta fueron guardados correctamente.";
    }

    return isEdit
        ? "Los cambios fueron guardados correctamente."
        : "El ticket fue creado correctamente.";
}