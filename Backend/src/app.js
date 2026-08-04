const express = require("express");
const cors = require("cors");
const path = require("path");

const {
    requireAuth,
    requirePageAuth
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

const frontendPath =
    path.join(
        __dirname,
        "../../Frontend"
    );

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
]
    .filter(Boolean)
    .map(
        (
            origin
        ) => {
            return String(
                origin
            )
                .trim()
                .replace(
                    /\/$/,
                    ""
                );
        }
    );

app.set(
    "trust proxy",
    1
);

app.disable(
    "x-powered-by"
);

app.use(
    cors({
        credentials:
            true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],

        origin(
            origin,
            callback
        ) {
            /*
             * Las solicitudes directas,
             * health checks y algunas llamadas
             * internas pueden llegar sin Origin.
             */
            if (!origin) {
                return callback(
                    null,
                    true
                );
            }

            const normalizedOrigin =
                String(
                    origin
                )
                    .trim()
                    .replace(
                        /\/$/,
                        ""
                    );

            if (
                allowedOrigins.includes(
                    normalizedOrigin
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
        extended:
            true
    })
);

/*
 * Encabezados básicos de seguridad.
 */
app.use(
    (
        req,
        res,
        next
    ) => {
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
app.get(
    "/",
    (
        req,
        res
    ) => {
        return res.redirect(
            "/Views/LogIn.html"
        );
    }
);

app.get(
    "/health",
    (
        req,
        res
    ) => {
        return res.json({
            status:
                "ok",

            message:
                "API is healthy"
        });
    }
);

app.get(
    "/test",
    (
        req,
        res
    ) => {
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
 * /auth/session valida la sesión.
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
 * Protección del frontend que todavía
 * se encuentra en Render.
 *
 * LogIn.html permanece público.
 */
app.use(
    "/Views",
    (
        req,
        res,
        next
    ) => {
        const requestedPath =
            req.path
                .toLowerCase();

        const isLoginPage =
            requestedPath ===
            "/login.html";

        if (isLoginPage) {
            return next();
        }

        return requirePageAuth(
            req,
            res,
            next
        );
    }
);

/*
 * Los archivos locales requieren sesión.
 */
app.use(
    "/uploads",
    requireAuth,
    express.static(
        uploadsPath
    )
);

/*
 * Se conserva temporalmente el frontend
 * de Render durante la migración.
 */
app.use(
    express.static(
        frontendPath
    )
);

/*
 * Ruta no encontrada.
 */
app.use(
    (
        req,
        res
    ) => {
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
                ok:
                    false,

                mensaje:
                    "Ruta no encontrada."
            });
    }
);

/*
 * Manejo general de errores.
 */
app.use(
    (
        error,
        req,
        res,
        next
    ) => {
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
                    ok:
                        false,

                    mensaje:
                        error.message
                });
        }

        return res
            .status(500)
            .json({
                ok:
                    false,

                mensaje:
                    "Ocurrió un error interno en el servidor."
            });
    }
);

module.exports =
    app;