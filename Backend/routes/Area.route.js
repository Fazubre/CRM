const express = require("express");
const {
    getAreas,
    getArea,
    postArea,
    putArea,
    deleteArea
} = require("../controllers/Area.controller");

const router = express.Router();

router.get("/", getAreas);
router.get("/:id", getArea);
router.post("/", postArea);
router.put("/:id", putArea);
router.delete("/:id", deleteArea);

module.exports = router;