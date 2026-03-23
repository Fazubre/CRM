const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const googleLoginRouter = require("../services/GoogleLogIn");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../Frontend")));

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

app.use("/auth", googleLoginRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Ir a http://localhost:${PORT}`);
});