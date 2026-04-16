const express = require("express");
const { postTicket, getTickets, putTicket } = require("../controllers/Ticket.controller");

const router = express.Router();

router.get("/", getTickets);
router.post("/", postTicket);
router.put("/:id", putTicket);

module.exports = router;