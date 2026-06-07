const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const app = express();

const googleLoginRouter = require("../services/GoogleLogIn");
const ticketRoutes = require("../routes/Ticket.route");
const clientRoutes = require("../routes/Client.route");
const employeeRoutes = require("../routes/Employee.route");
const areaRoutes = require("../routes/Area.route");
const calendarRoutes = require("../routes/Calendar.route");
const driveRoutes = require("../routes/Drive.route");

    
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../Frontend")));
app.use("/drive", driveRoutes);

app.get("/", (req, res) => {
    res.redirect("/Views/LogIn.html");
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "API is healthy"
    });
});

app.get("/test", (req, res) => {
    res.json({
        message: "API is working!"
    });
});


//Routes

app.use("/auth", googleLoginRouter);

app.use("/tickets", ticketRoutes);

app.use("/employees", employeeRoutes);

app.use("/clients", clientRoutes);

app.use("/areas", areaRoutes);

app.use("/calendar", calendarRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Ir a http://localhost:${PORT}`);
});

