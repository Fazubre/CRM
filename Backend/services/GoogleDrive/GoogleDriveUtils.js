function sanitizeDriveName(
    value,
    fallback = "Elemento"
) {
    const normalized =
        String(
            value ||
            fallback
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[\\/:*?"<>|]/g,
                "-"
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    return (
        normalized ||
        fallback
    );
}

function normalizeRelativePath(
    relativePath
) {
    return String(
        relativePath ||
        ""
    )
        .replaceAll(
            "\\",
            "/"
        )
        .split("/")
        .filter(Boolean);
}

function buildTicketFolderName(
    ticketId,
    ticketNumber,
    ticketTitle,
    employeeName
) {
    const number =
        ticketNumber !== null &&
        ticketNumber !== undefined &&
        ticketNumber !== ""
            ? ticketNumber
            : ticketId || "Sin numero";

    const title =
        sanitizeDriveName(
            ticketTitle,
            "Sin titulo"
        ).slice(
            0,
            80
        );

    const assignedEmployee =
        sanitizeDriveName(
            employeeName,
            "No asignado"
        ).slice(
            0,
            50
        );

    return [
        `Ticket ${number}`,
        title,
        assignedEmployee
    ].join(
        " - "
    );
}

function mapDriveFolder(
    folder
) {
    if (!folder) {
        return null;
    }

    return {
        id:
            folder.id ||
            "",

        nombre:
            folder.name ||
            "Carpeta",

        webViewLink:
            folder.webViewLink ||
            ""
    };
}

module.exports = {
    sanitizeDriveName,
    normalizeRelativePath,
    buildTicketFolderName,
    mapDriveFolder
};