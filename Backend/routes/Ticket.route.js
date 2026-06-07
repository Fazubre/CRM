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
    (req, res, next) => {
        uploadTicketFile.single("archivo")(req, res, (error) => {
            if (error) {
                return handleUploadError(error, req, res, next);
            }

            return next();
        });
    },
    postTicket
);

router.put(
    "/:id",
    (req, res, next) => {
        uploadTicketFile.single("archivo")(req, res, (error) => {
            if (error) {
                return handleUploadError(error, req, res, next);
            }

            return next();
        });
    },
    putTicket
);

module.exports = router;