const express = require("express");
const cors = require("cors");
const path = require("path");

const {
    requireAuth,
} = require("../middlewares/auth.middleware");

const googleLoginRouter =
    require("../services/GoogleLogIn");

const ticketRoutes =
    require("../routes/Ticket.route");

const clientRoutes =
    require("../routes/Client.route");

const employeeRoutes =
    require("../routes/Employee.route");

const areaRoutes =
    require("../routes/Area.route");

const calendarRoutes =
    require("../routes/Calendar.route");

const driveRoutes =
    require("../routes/Drive.route");

const app = express();


const uploadsPath =
    path.join(
        __dirname,
        "../uploads"
    );

const allowedOrigins = [
    process.env.APP_ORIGIN,
    process.env.APP_ORIGIN_WWW,
    "https://voyager-cr.com",
    "https://www.voyager-cr.com",
    "https://crm-c40k.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
].filter(Boolean);

app.set(
    "trust proxy",
    1
);

app.disable(
    "x-powered-by"
);

app.use(
    cors({
        credentials: true,

        origin(origin, callback) {
            /*
             * Las solicitudes del mismo servidor
             * pueden llegar sin encabezado Origin.
             */
            if (!origin) {
                return callback(
                    null,
                    true
                );
            }

            if (
                allowedOrigins.includes(
                    origin
                )
            ) {
                return callback(
                    null,
                    true
                );
            }

            return callback(
                new Error(
                    "Origen no permitido por CORS."
                )
            );
        }
    })
);

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

/*
 * Encabezados básicos de seguridad.
 */
app.use(
    (req, res, next) => {
        res.setHeader(
            "X-Content-Type-Options",
            "nosniff"
        );

        res.setHeader(
            "X-Frame-Options",
            "SAMEORIGIN"
        );

        res.setHeader(
            "Referrer-Policy",
            "strict-origin-when-cross-origin"
        );

        next();
    }
);

/*
 * Rutas públicas generales.
 */
const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://voyager-cr.com/CRM";

const LOGIN_URL =
    process.env.LOGIN_URL ||
    `${FRONTEND_URL}/Views/LogIn.html`;

app.get(
    "/",
    (req, res) => {
        return res.json({
            ok: true,
            servicio:
                "CRM Voyager API",

            frontend:
                FRONTEND_URL
        });
    }
);

app.get(
    "/health",
    (req, res) => {
        return res.json({
            status: "ok",
            message:
                "API is healthy"
        });
    }
);

app.get(
    "/test",
    (req, res) => {
        return res.json({
            message:
                "API is working!"
        });
    }
);

/*
 * Rutas de autenticación.
 *
 * /auth/google es pública.
 * /auth/session se protege dentro de GoogleLogIn.js.
 * /auth/logout elimina la sesión.
 */
app.use(
    "/auth",
    googleLoginRouter
);

/*
 * APIs privadas.
 */
app.use(
    "/tickets",
    requireAuth,
    ticketRoutes
);

app.use(
    "/employees",
    requireAuth,
    employeeRoutes
);

app.use(
    "/clients",
    requireAuth,
    clientRoutes
);

app.use(
    "/areas",
    requireAuth,
    areaRoutes
);

app.use(
    "/calendar",
    requireAuth,
    calendarRoutes
);

app.use(
    "/drive",
    requireAuth,
    driveRoutes
);

/*
 * Protección de las páginas privadas.
 *
 * LogIn.html es la única página pública
 * dentro de la carpeta Views.
 */


/*
 * Los archivos subidos requieren sesión.
 */
app.use(
    "/uploads",
    requireAuth,
    express.static(
        uploadsPath
    )
);

/*
 * Servir el frontend.
 *
 * Debe colocarse después del middleware
 * que protege la carpeta Views.
 */


/*
 * Ruta no encontrada.
 */
app.use(
    (req, res) => {
        const acceptsHtml =
            String(
                req.headers.accept ||
                ""
            ).includes(
                "text/html"
            );

        if (acceptsHtml) {
            return res
                .status(404)
                .send(
                    "Página no encontrada."
                );
        }

        return res
            .status(404)
            .json({
                ok: false,
                mensaje:
                    "Ruta no encontrada."
            });
    }
);

/*
 * Manejo general de errores.
 */
app.use(
    (error, req, res, next) => {
        console.error(
            "Error general del servidor:",
            error
        );

        if (
            error.message ===
            "Origen no permitido por CORS."
        ) {
            return res
                .status(403)
                .json({
                    ok: false,
                    mensaje:
                        error.message
                });
        }

        return res
            .status(500)
            .json({
                ok: false,
                mensaje:
                    "Ocurrió un error interno en el servidor."
            });
    }
);

module.exports = app;