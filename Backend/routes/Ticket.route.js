const express = require("express");

const {
    postTicket,
    getTickets,
    putTicket,
    removeTicket
} = require("../controllers/Ticket.controller");

const uploadTicketFile = require("../middlewares/uploadTicketFile");
const handleUploadError = require("../middlewares/handleUploadError");

const router = express.Router();

router.delete(
    "/:id",
    removeTicket
);

const procesarAdjuntosTicket = uploadTicketFile.fields([
    {
        name: "archivo",
        maxCount: 1
    },
    {
        name: "carpetaArchivos",
        maxCount: 100
    }
]);

router.get("/", getTickets);

router.post(
    "/",
    procesarAdjuntosTicket,
    handleUploadError,
    postTicket
);

router.put(
    "/:id",
    procesarAdjuntosTicket,
    handleUploadError,
    putTicket
);

module.exports = router;