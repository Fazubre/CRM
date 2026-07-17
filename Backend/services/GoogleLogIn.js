const express = require("express");
const {
    OAuth2Client
} = require("google-auth-library");

const {
    syncEmployeeFromGoogle,
    getEmployeeByEmail
} = require("../models/Employee.model");

const {
    createSession,
    deleteSessionFromRequest,
    setSessionCookie,
    clearSessionCookie
} = require("./Session.service");

const {
    requireAuth,
    isEmployeeActive,
    getPublicEmployee
} = require("../middlewares/auth.middleware");

const router =
    express.Router();

const clienteGoogle =
    new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID
    );

router.post(
    "/google",
    async (req, res) => {
        try {
            const {
                credential
            } = req.body;

            if (!credential) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        mensaje:
                            "No se recibió el token de Google."
                    });
            }

            const ticket =
                await clienteGoogle
                    .verifyIdToken({
                        idToken:
                            credential,

                        audience:
                            process.env
                                .GOOGLE_CLIENT_ID
                    });

            const payload =
                ticket.getPayload();

            if (!payload) {
                return res
                    .status(401)
                    .json({
                        ok: false,
                        mensaje:
                            "No fue posible obtener los datos del usuario."
                    });
            }

            if (
                payload.email_verified !==
                true
            ) {
                return res
                    .status(403)
                    .json({
                        ok: false,
                        mensaje:
                            "La cuenta de Google no tiene un correo verificado."
                    });
            }

            const correo =
                String(
                    payload.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            if (!correo) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        mensaje:
                            "Google no devolvió el correo del usuario."
                    });
            }

            /*
             * Primero se verifica que el empleado
             * ya exista en el CRM.
             *
             * Esto evita que cualquier cuenta
             * de Google pueda registrarse sola.
             */
            const employeeExistente =
                await getEmployeeByEmail(
                    correo
                );

            if (!employeeExistente) {
                return res
                    .status(403)
                    .json({
                        ok: false,
                        mensaje:
                            "Su cuenta no está autorizada para utilizar el CRM."
                    });
            }

            if (
                !isEmployeeActive(
                    employeeExistente
                )
            ) {
                return res
                    .status(403)
                    .json({
                        ok: false,
                        mensaje:
                            "El usuario se encuentra inactivo."
                    });
            }

            const usuarioGoogle = {
                google_id:
                    payload.sub,

                nombre:
                    payload.name ||
                    employeeExistente.nombre ||
                    "",

                correo,

                foto_url:
                    payload.picture ||
                    "",

                correo_verificado:
                    true
            };

            const employeeSincronizado =
                await syncEmployeeFromGoogle(
                    usuarioGoogle
                );

            const employee = {
                ...employeeExistente,
                ...employeeSincronizado,

                id:
                    employeeSincronizado?.id ||
                    employeeExistente.id
            };

            if (!employee.id) {
                throw new Error(
                    "No fue posible identificar al empleado."
                );
            }

            /*
             * Elimina una sesión anterior
             * que llegue en la cookie.
             */
            await deleteSessionFromRequest(
                req
            );

            const nuevaSesion =
                await createSession(
                    employee.id,
                    req
                );

            setSessionCookie(
                res,
                nuevaSesion.token
            );

            res.set(
                "Cache-Control",
                "no-store"
            );

            return res
                .status(200)
                .json({
                    ok: true,
                    mensaje:
                        "Login con Google exitoso.",
                    usuario:
                        getPublicEmployee(
                            employee
                        )
                });
        } catch (error) {
            console.error(
                "Error en login con Google:",
                error
            );

            clearSessionCookie(res);

            return res
                .status(401)
                .json({
                    ok: false,
                    mensaje:
                        error.message ||
                        "Token inválido, expirado o no autorizado."
                });
        }
    }
);

router.get(
    "/session",
    requireAuth,
    (req, res) => {
        res.set(
            "Cache-Control",
            "no-store"
        );

        return res
            .status(200)
            .json({
                ok: true,
                usuario:
                    getPublicEmployee(
                        req.user
                    )
            });
    }
);

router.post(
    "/logout",
    async (req, res) => {
        try {
            await deleteSessionFromRequest(
                req
            );

            clearSessionCookie(res);

            return res
                .status(200)
                .json({
                    ok: true,
                    mensaje:
                        "Sesión cerrada correctamente."
                });
        } catch (error) {
            console.error(
                "Error cerrando sesión:",
                error
            );

            clearSessionCookie(res);

            return res
                .status(200)
                .json({
                    ok: true,
                    mensaje:
                        "La sesión local fue eliminada."
                });
        }
    }
);

module.exports = router;