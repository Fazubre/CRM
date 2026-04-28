const express = require("express");

const {
    conectarCalendar,
    callbackCalendar
} = require("../controllers/Calendar.controller");

const router = express.Router();

router.get("/conectar", conectarCalendar);
router.get("/callback", callbackCalendar);

module.exports = router;