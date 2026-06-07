const express = require("express");

const {
    postTicket,
    getTickets,
    putTicket
} = require("../controllers/Ticket.controller");

const uploadTicketFile = require("../middlewares/uploadTicketFile");
const handleUploadError = require("../middlewares/handleUploadError");

const router = express.Router();

router.get("/", getTickets);

router.post(
    "/",
    uploadTicketFile.single("archivo"),
    handleUploadError,
    postTicket
);

router.put(
    "/:id",
    uploadTicketFile.single("archivo"),
    handleUploadError,
    putTicket
);

module.exports = router;