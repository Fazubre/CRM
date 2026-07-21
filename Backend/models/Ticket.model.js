const {
    FieldValue
} = require(
    "firebase-admin/firestore"
);

const {
    db
} = require(
    "../services/Firebase"
);

function validateTicketData(
    datosTicket
) {
    if (
        !datosTicket ||
        typeof datosTicket !==
        "object"
    ) {
        throw new Error(
            "No se recibieron los datos del ticket."
        );
    }

    if (
        typeof datosTicket.titulo !==
        "string" ||
        !datosTicket.titulo.trim()
    ) {
        throw new Error(
            "Falta el campo requerido: titulo"
        );
    }
}

function validateTicketId(
    ticketId
) {
    if (
        !ticketId ||
        !String(ticketId).trim()
    ) {
        throw new Error(
            "Falta el id del ticket."
        );
    }
}

function normalizeTicketStatus(
    estado
) {
    const estadoNormalizado =
        String(
            estado ||
            "abierto"
        )
            .trim()
            .toLowerCase();

    const isCompleted =
        estadoNormalizado ===
        "completado";

    return {
        estadoTicketId:
            isCompleted
                ? "2"
                : "1",

        estadoNombre:
            isCompleted
                ? "Completado"
                : "Abierto",

        isCompleted
    };
}

async function createTicket(
    datosTicket
) {
    console.log(
        "TICKET MODEL VERSION: 2026-07-COMMENTS-DRIVE-V1"
    );

    validateTicketData(
        datosTicket
    );

    const {
        usuarioId = "",
        usuarioNombre = "Usuario",
        titulo,
        descripcion = "",
        prioridad = "media",
        fechaVencimiento = null,
        empleadoId = "",
        empleadoNombre = "No asignado",
        clienteId = "",
        clienteNombre = "No asignado",
        areaId = "",
        areaName = "No asignada",
        archivoAdjunto = null,
        googleDrive = null
    } = datosTicket;

    const contadorRef =
        db
            .collection("counters")
            .doc("tickets");

    const ticketRef =
        db
            .collection("tickets")
            .doc();

    await db.runTransaction(
        async (
            transaction
        ) => {
            const contadorSnap =
                await transaction.get(
                    contadorRef
                );

            const ultimoNumero =
                contadorSnap.exists
                    ? Number(
                        contadorSnap
                            .data()
                            .ultimoNumero ||
                        0
                    )
                    : 0;

            const numeroTicket =
                ultimoNumero + 1;

            const ticketNuevo = {
                numeroTicket,

                usuarioId:
                    String(
                        usuarioId ||
                        ""
                    ),

                usuarioNombre:
                    usuarioNombre ||
                    "Usuario",

                titulo:
                    titulo.trim(),

                descripcion:
                    String(
                        descripcion ||
                        ""
                    ).trim(),

                prioridad:
                    String(
                        prioridad ||
                        "media"
                    ).toLowerCase(),

                fechaVencimiento:
                    fechaVencimiento ||
                    null,

                expirationDate:
                    fechaVencimiento
                        ? new Date(
                            fechaVencimiento
                        )
                        : null,

                empleadoId:
                    String(
                        empleadoId ||
                        ""
                    ),

                empleadoNombre:
                    empleadoId
                        ? empleadoNombre ||
                            "Empleado"
                        : "No asignado",

                clienteId:
                    String(
                        clienteId ||
                        ""
                    ),

                clienteNombre:
                    clienteId
                        ? clienteNombre ||
                            "Cliente"
                        : "No asignado",

                areaId:
                    String(
                        areaId ||
                        ""
                    ),

                areaName:
                    areaId
                        ? areaName ||
                            "Área"
                        : "No asignada",

                archivoAdjunto:
                    archivoAdjunto ||
                    null,

                googleDrive:
                    googleDrive ||
                    null,

                estadoTicketId:
                    "1",

                estadoNombre:
                    "Abierto",

                isCompleted:
                    false,

                createdAt:
                    FieldValue
                        .serverTimestamp(),

                updatedAt:
                    FieldValue
                        .serverTimestamp()
            };

            transaction.set(
                ticketRef,
                ticketNuevo
            );

            transaction.set(
                contadorRef,
                {
                    ultimoNumero:
                        numeroTicket,

                    updatedAt:
                        FieldValue
                            .serverTimestamp()
                },
                {
                    merge:
                        true
                }
            );
        }
    );

    const ticketCreadoSnap =
        await ticketRef.get();

    return mapTicket(
        ticketCreadoSnap.id,
        ticketCreadoSnap.data()
    );
}

async function getTicketById(
    ticketId
) {
    validateTicketId(
        ticketId
    );

    const ticketSnap =
        await db
            .collection("tickets")
            .doc(
                String(ticketId)
            )
            .get();

    if (!ticketSnap.exists) {
        throw new Error(
            "El ticket no existe."
        );
    }

    return mapTicket(
        ticketSnap.id,
        ticketSnap.data()
    );
}

async function getAllTickets() {
    const snapshot =
        await db
            .collection("tickets")
            .orderBy(
                "createdAt",
                "desc"
            )
            .get();

    return snapshot.docs.map(
        (
            doc
        ) => {
            return mapTicket(
                doc.id,
                doc.data()
            );
        }
    );
}

async function updateTicket(
    ticketId,
    datosTicket
) {
    validateTicketId(
        ticketId
    );

    validateTicketData(
        datosTicket
    );

    const ticketRef =
        db
            .collection("tickets")
            .doc(
                String(ticketId)
            );

    const ticketSnap =
        await ticketRef.get();

    if (!ticketSnap.exists) {
        throw new Error(
            "El ticket no existe."
        );
    }

    const estado =
        normalizeTicketStatus(
            datosTicket.estado
        );

    const empleadoId =
        String(
            datosTicket.empleadoId ||
            ""
        );

    const clienteId =
        String(
            datosTicket.clienteId ||
            ""
        );

    const areaId =
        String(
            datosTicket.areaId ||
            ""
        );

    const datosActualizar = {
        titulo:
            datosTicket
                .titulo
                .trim(),

        descripcion:
            String(
                datosTicket.descripcion ||
                ""
            ).trim(),

        prioridad:
            String(
                datosTicket.prioridad ||
                "media"
            ).toLowerCase(),

        fechaVencimiento:
            datosTicket
                .fechaVencimiento ||
            null,

        expirationDate:
            datosTicket
                .fechaVencimiento
                ? new Date(
                    datosTicket
                        .fechaVencimiento
                )
                : null,

        empleadoId,

        empleadoNombre:
            empleadoId
                ? datosTicket
                    .empleadoNombre ||
                    "Empleado"
                : "No asignado",

        clienteId,

        clienteNombre:
            clienteId
                ? datosTicket
                    .clienteNombre ||
                    "Cliente"
                : "No asignado",

        areaId,

        areaName:
            areaId
                ? datosTicket
                    .areaName ||
                    "Área"
                : "No asignada",

        estadoTicketId:
            estado
                .estadoTicketId,

        estadoNombre:
            estado
                .estadoNombre,

        isCompleted:
            estado
                .isCompleted,

        updatedAt:
            FieldValue
                .serverTimestamp()
    };

    if (
        Object.prototype
            .hasOwnProperty
            .call(
                datosTicket,
                "archivoAdjunto"
            ) &&
        datosTicket.archivoAdjunto
    ) {
        datosActualizar
            .archivoAdjunto =
            datosTicket
                .archivoAdjunto;
    }

    await ticketRef.update(
        datosActualizar
    );

    const ticketActualizadoSnap =
        await ticketRef.get();

    return mapTicket(
        ticketActualizadoSnap.id,
        ticketActualizadoSnap.data()
    );
}

async function updateTicketDriveData(
    ticketId,
    datosDrive
) {
    validateTicketId(
        ticketId
    );

    if (
        !datosDrive ||
        typeof datosDrive !==
        "object"
    ) {
        throw new Error(
            "No se recibieron los datos de Google Drive."
        );
    }

    const ticketRef =
        db
            .collection("tickets")
            .doc(
                String(ticketId)
            );

    const ticketSnap =
        await ticketRef.get();

    if (!ticketSnap.exists) {
        throw new Error(
            "El ticket no existe."
        );
    }

    const datosActualizar = {
        updatedAt:
            FieldValue
                .serverTimestamp()
    };

    if (
        Object.prototype
            .hasOwnProperty
            .call(
                datosDrive,
                "googleDrive"
            )
    ) {
        datosActualizar
            .googleDrive =
            datosDrive
                .googleDrive ||
            null;
    }

    if (
        Object.prototype
            .hasOwnProperty
            .call(
                datosDrive,
                "archivoAdjunto"
            )
    ) {
        datosActualizar
            .archivoAdjunto =
            datosDrive
                .archivoAdjunto ||
            null;
    }

    await ticketRef.update(
        datosActualizar
    );

    const ticketActualizadoSnap =
        await ticketRef.get();

    return mapTicket(
        ticketActualizadoSnap.id,
        ticketActualizadoSnap.data()
    );
}

async function deleteTicketComments(
    ticketRef
) {
    const BATCH_SIZE =
        400;

    while (true) {
        const snapshot =
            await ticketRef
                .collection(
                    "comments"
                )
                .limit(
                    BATCH_SIZE
                )
                .get();

        if (snapshot.empty) {
            break;
        }

        const batch =
            db.batch();

        snapshot.docs.forEach(
            (
                document
            ) => {
                batch.delete(
                    document.ref
                );
            }
        );

        await batch.commit();

        if (
            snapshot.size <
            BATCH_SIZE
        ) {
            break;
        }
    }
}

async function deleteTicket(
    ticketId
) {
    validateTicketId(
        ticketId
    );

    const ticketRef =
        db
            .collection("tickets")
            .doc(
                String(ticketId)
            );

    const ticketSnap =
        await ticketRef.get();

    if (!ticketSnap.exists) {
        throw new Error(
            "El ticket no existe."
        );
    }

    const ticket =
        mapTicket(
            ticketSnap.id,
            ticketSnap.data()
        );

    await deleteTicketComments(
        ticketRef
    );

    await ticketRef.delete();

    return {
        id:
            ticket.id,

        numeroTicket:
            ticket.numeroTicket,

        eliminado:
            true
    };
}

function mapTicket(
    id,
    data
) {
    const ticketData =
        data ||
        {};

    return {
        id,

        numeroTicket:
            ticketData
                .numeroTicket ||
            "",

        usuarioId:
            ticketData
                .usuarioId ||
            ticketData
                .userCreatorId ||
            "",

        usuarioNombre:
            ticketData
                .usuarioNombre ||
            ticketData
                .snapshots
                ?.usuarioNombre ||
            "Usuario",

        titulo:
            ticketData
                .titulo ||
            "",

        descripcion:
            ticketData
                .descripcion ||
            "",

        prioridad:
            ticketData
                .prioridad ||
            "media",

        fechaVencimiento:
            ticketData
                .fechaVencimiento ||
            null,

        expirationDate:
            ticketData
                .expirationDate ||
            null,

        empleadoId:
            ticketData
                .empleadoId ||
            ticketData
                .assignedEmployeeId ||
            "",

        empleadoNombre:
            ticketData
                .empleadoNombre ||
            ticketData
                .snapshots
                ?.empleadoNombre ||
            "No asignado",

        clienteId:
            ticketData
                .clienteId ||
            "",

        clienteNombre:
            ticketData
                .clienteNombre ||
            ticketData
                .snapshots
                ?.clienteNombre ||
            "No asignado",

        areaId:
            ticketData
                .areaId ||
            "",

        areaName:
            ticketData
                .areaName ||
            ticketData
                .snapshots
                ?.areaName ||
            "No asignada",

        archivoAdjunto:
            ticketData
                .archivoAdjunto ||
            ticketData
                .archivo ||
            ticketData
                .attachment ||
            null,

        googleDrive:
            ticketData
                .googleDrive ||
            ticketData
                .drive ||
            ticketData
                .driveStructure ||
            null,

        estadoTicketId:
            ticketData
                .estadoTicketId ||
            "",

        estadoNombre:
            ticketData
                .estadoNombre ||
            ticketData
                .snapshots
                ?.estadoNombre ||
            "Abierto",

        isCompleted:
            Boolean(
                ticketData
                    .isCompleted
            ),

        createdAt:
            ticketData
                .createdAt ||
            null,

        updatedAt:
            ticketData
                .updatedAt ||
            null
    };
}

module.exports = {
    createTicket,
    getTicketById,
    getAllTickets,
    updateTicket,
    updateTicketDriveData,
    deleteTicket
};