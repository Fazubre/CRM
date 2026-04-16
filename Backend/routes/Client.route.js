const express = require("express");
const {
    postClient,
    getClients,
    getClient,
    putClient,
    removeClient
} = require("../controllers/Client.controller");

const router = express.Router();

router.post("/", postClient);
router.get("/", getClients);
router.get("/:id", getClient);
router.put("/:id", putClient);
router.delete("/:id", removeClient);

module.exports = router;