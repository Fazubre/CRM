const express = require("express");
const {
    postEmployee,
    getEmployees,
    getEmployee,
    getEmployeeByGoogle,
    getEmployeeByCorreo,
    putEmployee,
    patchEmployeeStatus
} = require("../controllers/Employee.controller");

const router = express.Router();

router.post("/", postEmployee);
router.get("/", getEmployees);
router.get("/buscar-por-correo", getEmployeeByCorreo);
router.get("/google/:googleId", getEmployeeByGoogle);
router.get("/:employeeId", getEmployee);
router.put("/:employeeId", putEmployee);
router.patch("/:employeeId/status", patchEmployeeStatus);

module.exports = router;