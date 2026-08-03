const express = require(
    "express"
);

const ticketCommentRoutes =
    require(
        "./TicketComment.route"
    );

const {
    postTicket,
    getTickets,
    getDashboardTickets,
    getTicket,
    putTicket,
    removeTicket
} = require(
    "../controllers/Ticket.controller"
);

const uploadTicketFile =
    require(
        "../middlewares/uploadTicketFile"
    );

const handleUploadError =
    require(
        "../middlewares/handleUploadError"
    );

const router =
    express.Router();

const processTicketAttachments =
    uploadTicketFile.fields([
        {
            name:
                "archivo",

            maxCount:
                1
        },
        {
            name:
                "carpetaArchivos",

            maxCount:
                100
        }
    ]);

/*
    GET /tickets
*/
router.get(
    "/",
    getTickets
);

/*
    GET /tickets/dashboard

    Esta ruta debe estar antes de /:id.
    De lo contrario, Express interpretaría
    "dashboard" como el ID de un ticket.
*/
router.get(
    "/dashboard",
    getDashboardTickets
);

/*
    Rutas de comentarios:

    GET    /tickets/:ticketId/comments
    POST   /tickets/:ticketId/comments
    PUT    /tickets/:ticketId/comments/:commentId
    DELETE /tickets/:ticketId/comments/:commentId
*/
router.use(
    "/:ticketId/comments",
    ticketCommentRoutes
);

/*
    GET /tickets/:id
*/
router.get(
    "/:id",
    getTicket
);

/*
    POST /tickets
*/
router.post(
    "/",
    processTicketAttachments,
    handleUploadError,
    postTicket
);

/*
    PUT /tickets/:id
*/
router.put(
    "/:id",
    processTicketAttachments,
    handleUploadError,
    putTicket
);

/*
    DELETE /tickets/:id
*/
router.delete(
    "/:id",
    removeTicket
);

module.exports =
    router;