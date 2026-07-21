const express = require(
    "express"
);

const {
    postTicket,
    getTickets,
    getTicket,
    putTicket
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

router.get(
    "/",
    getTickets
);

router.get(
    "/:id",
    getTicket
);

router.post(
    "/",
    processTicketAttachments,
    handleUploadError,
    postTicket
);

router.put(
    "/:id",
    processTicketAttachments,
    handleUploadError,
    putTicket
);

module.exports =
    router;