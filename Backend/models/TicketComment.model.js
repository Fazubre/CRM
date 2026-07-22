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

function validateId(
    value,
    fieldName
) {
    if (
        !value ||
        !String(value).trim()
    ) {
        throw new Error(
            `Falta el ${fieldName}.`
        );
    }
}

function validateCommentData(
    commentData
) {
    if (
        !commentData ||
        typeof commentData !==
        "object"
    ) {
        throw new Error(
            "No se recibieron los datos del comentario."
        );
    }

    if (
        typeof commentData.comentario !==
        "string" ||
        !commentData.comentario.trim()
    ) {
        throw new Error(
            "El texto del comentario es obligatorio."
        );
    }
}

function validateAuthorData(
    commentData
) {
    if (
        !commentData.autorId ||
        !String(
            commentData.autorId
        ).trim()
    ) {
        throw new Error(
            "No se recibió el id del autor."
        );
    }

    if (
        !commentData.autorNombre ||
        !String(
            commentData.autorNombre
        ).trim()
    ) {
        throw new Error(
            "No se recibió el nombre del autor."
        );
    }
}

async function getExistingTicketRef(
    ticketId
) {
    validateId(
        ticketId,
        "id del ticket"
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

    return ticketRef;
}

async function createTicketComment(
    ticketId,
    commentData
) {
    validateCommentData(
        commentData
    );

    validateAuthorData(
        commentData
    );

    const ticketRef =
        await getExistingTicketRef(
            ticketId
        );

    const commentRef =
        ticketRef
            .collection("comments")
            .doc();

    const commentToCreate = {
        ticketId:
            String(ticketId),

        autorId:
            String(
                commentData.autorId
            ),

        autorNombre:
            String(
                commentData.autorNombre
            ).trim(),

        autorCorreo:
            String(
                commentData.autorCorreo ||
                ""
            ).trim(),

        comentario:
            commentData
                .comentario
                .trim(),

        archivoAdjunto:
            commentData
                .archivoAdjunto ||
            null,

        editado:
            false,

        createdAt:
            FieldValue
                .serverTimestamp(),

        updatedAt:
            FieldValue
                .serverTimestamp()
    };

    await commentRef.set(
        commentToCreate
    );

    const createdCommentSnap =
        await commentRef.get();

    return mapTicketComment(
        createdCommentSnap.id,
        createdCommentSnap.data()
    );
}

async function getTicketComments(
    ticketId
) {
    const ticketRef =
        await getExistingTicketRef(
            ticketId
        );

    const snapshot =
        await ticketRef
            .collection("comments")
            .orderBy(
                "createdAt",
                "asc"
            )
            .get();

    return snapshot.docs.map(
        (
            document
        ) => {
            return mapTicketComment(
                document.id,
                document.data()
            );
        }
    );
}

async function getTicketCommentById(
    ticketId,
    commentId
) {
    validateId(
        commentId,
        "id del comentario"
    );

    const ticketRef =
        await getExistingTicketRef(
            ticketId
        );

    const commentSnap =
        await ticketRef
            .collection("comments")
            .doc(
                String(commentId)
            )
            .get();

    if (!commentSnap.exists) {
        throw new Error(
            "El comentario no existe."
        );
    }

    return mapTicketComment(
        commentSnap.id,
        commentSnap.data()
    );
}

async function updateTicketComment(
    ticketId,
    commentId,
    commentData
) {
    validateId(
        commentId,
        "id del comentario"
    );

    validateCommentData(
        commentData
    );

    const ticketRef =
        await getExistingTicketRef(
            ticketId
        );

    const commentRef =
        ticketRef
            .collection("comments")
            .doc(
                String(commentId)
            );

    const commentSnap =
        await commentRef.get();

    if (!commentSnap.exists) {
        throw new Error(
            "El comentario no existe."
        );
    }

    const updateData = {
        comentario:
            commentData
                .comentario
                .trim(),

        editado:
            true,

        updatedAt:
            FieldValue
                .serverTimestamp()
    };

    if (
        Object.prototype
            .hasOwnProperty
            .call(
                commentData,
                "archivoAdjunto"
            )
    ) {
        updateData.archivoAdjunto =
            commentData
                .archivoAdjunto ||
            null;
    }
        if (
        Object.prototype
            .hasOwnProperty
            .call(
                commentData,
                "googleDrive"
            )
    ) {
        updateData.googleDrive =
            commentData
                .googleDrive ||
            null;
    }

    await commentRef.update(
        updateData
    );

    const updatedCommentSnap =
        await commentRef.get();

    return mapTicketComment(
        updatedCommentSnap.id,
        updatedCommentSnap.data()
    );
}
async function updateTicketCommentDriveData(
    ticketId,
    commentId,
    driveData
) {
    validateId(
        commentId,
        "id del comentario"
    );

    if (
        !driveData ||
        typeof driveData !==
        "object"
    ) {
        throw new Error(
            "No se recibieron los datos de Google Drive del comentario."
        );
    }

    const ticketRef =
        await getExistingTicketRef(
            ticketId
        );

    const commentRef =
        ticketRef
            .collection("comments")
            .doc(
                String(commentId)
            );

    const commentSnap =
        await commentRef.get();

    if (!commentSnap.exists) {
        throw new Error(
            "El comentario no existe."
        );
    }

    const updateData = {
        updatedAt:
            FieldValue
                .serverTimestamp()
    };

    if (
        Object.prototype
            .hasOwnProperty
            .call(
                driveData,
                "archivoAdjunto"
            )
    ) {
        updateData.archivoAdjunto =
            driveData
                .archivoAdjunto ||
            null;
    }

    if (
        Object.prototype
            .hasOwnProperty
            .call(
                driveData,
                "googleDrive"
            )
    ) {
        updateData.googleDrive =
            driveData
                .googleDrive ||
            null;
    }

    await commentRef.update(
        updateData
    );

    const updatedCommentSnap =
        await commentRef.get();

    return mapTicketComment(
        updatedCommentSnap.id,
        updatedCommentSnap.data()
    );
}

async function deleteTicketComment(
    ticketId,
    commentId
) {
    validateId(
        commentId,
        "id del comentario"
    );

    const ticketRef =
        await getExistingTicketRef(
            ticketId
        );

    const commentRef =
        ticketRef
            .collection("comments")
            .doc(
                String(commentId)
            );

    const commentSnap =
        await commentRef.get();

    if (!commentSnap.exists) {
        throw new Error(
            "El comentario no existe."
        );
    }

    const deletedComment =
        mapTicketComment(
            commentSnap.id,
            commentSnap.data()
        );

    await commentRef.delete();

    return {
        ...deletedComment,

        eliminado:
            true
    };
}

function mapTicketComment(
    id,
    data
) {
    const commentData =
        data ||
        {};

    return {
        id,

        ticketId:
            commentData
                .ticketId ||
            "",

        autorId:
            commentData
                .autorId ||
            "",

        autorNombre:
            commentData
                .autorNombre ||
            "Usuario",

        autorCorreo:
            commentData
                .autorCorreo ||
            "",

        comentario:
            commentData
                .comentario ||
            "",

        archivoAdjunto:
            commentData
                .archivoAdjunto ||
            null,
        googleDrive:
        commentData
            .googleDrive ||
        null,

        editado:
            Boolean(
                commentData
                    .editado
            ),

        createdAt:
            commentData
                .createdAt ||
            null,

        updatedAt:
            commentData
                .updatedAt ||
            null
    };
}

module.exports = {
    createTicketComment,
    getTicketComments,
    getTicketCommentById,
    updateTicketComment,
    updateTicketCommentDriveData,
    deleteTicketComment
};