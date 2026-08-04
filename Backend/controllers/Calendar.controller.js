const {
    google
} = require(
    "googleapis"
);

const {
    getEmployeeCalendarData,
    saveEmployeeCalendarTokens
} = require(
    "../models/Calendar.model"
);

const {
    generarUrlGoogleCalendar,
    obtenerTokensDesdeCodigo,
    crearOAuthClient
} = require(
    "../services/GoogleCalendar"
);

const FRONTEND_CALENDAR_URL =
    String(
        process.env.FRONTEND_CALENDAR_URL ||
        "https://voyager-cr.com/CRM/Frontend/Views/calendar.html"
    ).trim();

function construirRedirect(
    parametros = {}
) {
    const url =
        new URL(
            FRONTEND_CALENDAR_URL
        );

    Object
        .entries(
            parametros
        )
        .forEach(
            ([
                nombre,
                valor
            ]) => {
                if (
                    valor === null ||
                    valor === undefined ||
                    valor === ""
                ) {
                    return;
                }

                url.searchParams.set(
                    nombre,
                    String(
                        valor
                    )
                );
            }
        );

    return url.toString();
}

function construirRedirectError(
    mensaje,
    empleadoId = "",
    correo = ""
) {
    return construirRedirect({
        estado:
            "error",

        mensaje:
            mensaje ||
            "No fue posible conectar Google Calendar.",

        empleadoId,

        correo
    });
}

function construirRedirectOk(
    empleadoId,
    correo
) {
    return construirRedirect({
        estado:
            "ok",

        empleadoId,

        correo:
            correo ||
            ""
    });
}

async function conectarCalendar(
    req,
    res
) {
    const empleadoId =
        String(
            req.query.empleadoId ||
            ""
        ).trim();

    try {
        if (!empleadoId) {
            return res.redirect(
                construirRedirectError(
                    "No se recibió el ID del empleado."
                )
            );
        }

        const datosEmpleadoCalendar =
            await getEmployeeCalendarData(
                empleadoId
            );

        if (!datosEmpleadoCalendar) {
            return res.redirect(
                construirRedirectError(
                    "El empleado no existe en Firestore.",
                    empleadoId
                )
            );
        }

        const empleado =
            datosEmpleadoCalendar.empleado ||
            {};

        const correoEmpleado =
            empleado.correo ||
            empleado.email ||
            "";

        const urlGoogle =
            generarUrlGoogleCalendar(
                empleadoId,
                correoEmpleado
            );

        return res.redirect(
            urlGoogle
        );
    } catch (error) {
        console.error(
            "Error al conectar Google Calendar:",
            error
        );

        return res.redirect(
            construirRedirectError(
                error.message ||
                "No fue posible iniciar la conexión con Google Calendar.",
                empleadoId
            )
        );
    }
}

async function callbackCalendar(
    req,
    res
) {
    let empleadoId =
        String(
            req.query.state ||
            ""
        ).trim();

    try {
        const {
            code,
            error:
                errorGoogle
        } = req.query;

        if (errorGoogle) {
            return res.redirect(
                construirRedirectError(
                    (
                        "Google rechazó la autorización: " +
                        errorGoogle
                    ),
                    empleadoId
                )
            );
        }

        if (!code) {
            return res.redirect(
                construirRedirectError(
                    "No se recibió el código de autorización de Google.",
                    empleadoId
                )
            );
        }

        if (!empleadoId) {
            return res.redirect(
                construirRedirectError(
                    "No se recibió el ID del empleado."
                )
            );
        }

        const datosEmpleadoCalendar =
            await getEmployeeCalendarData(
                empleadoId
            );

        if (!datosEmpleadoCalendar) {
            return res.redirect(
                construirRedirectError(
                    "El empleado no existe en Firestore.",
                    empleadoId
                )
            );
        }

        const empleado =
            datosEmpleadoCalendar.empleado ||
            {};

        const tokens =
            await obtenerTokensDesdeCodigo(
                code
            );

        if (!tokens.refresh_token) {
            return res.redirect(
                construirRedirectError(
                    (
                        "No se recibió refresh_token. " +
                        "Revoca el acceso de la aplicación en Google " +
                        "y vuelve a conectar."
                    ),
                    empleadoId
                )
            );
        }

        const oauth2Client =
            crearOAuthClient();

        oauth2Client.setCredentials(
            tokens
        );

        const oauth2 =
            google.oauth2({
                auth:
                    oauth2Client,

                version:
                    "v2"
            });

        const perfil =
            await oauth2
                .userinfo
                .get();

        const correoEmpleado =
            String(
                empleado.correo ||
                empleado.email ||
                ""
            )
                .trim()
                .toLowerCase();

        const correoGoogle =
            String(
                perfil.data.email ||
                ""
            )
                .trim()
                .toLowerCase();

        if (
            correoEmpleado &&
            correoGoogle &&
            correoEmpleado !==
                correoGoogle
        ) {
            return res.redirect(
                construirRedirectError(
                    (
                        `El correo conectado (${correoGoogle}) ` +
                        `no coincide con el correo del empleado ` +
                        `(${correoEmpleado}).`
                    ),
                    empleadoId,
                    correoGoogle
                )
            );
        }

        const datosCalendar = {
            googleId:
                perfil.data.id ||
                "",

            nombreGoogle:
                perfil.data.name ||
                "",

            correoGoogle:
                perfil.data.email ||
                "",

            accessToken:
                tokens.access_token ||
                "",

            refreshToken:
                tokens.refresh_token ||
                "",

            scope:
                tokens.scope ||
                "",

            tokenType:
                tokens.token_type ||
                "",

            expiryDate:
                tokens.expiry_date ||
                null
        };

        await saveEmployeeCalendarTokens(
            empleadoId,
            datosCalendar
        );

        return res.redirect(
            construirRedirectOk(
                empleadoId,
                datosCalendar.correoGoogle
            )
        );
    } catch (error) {
        console.error(
            "Error en callback de Google Calendar:",
            error
        );

        return res.redirect(
            construirRedirectError(
                error.message ||
                "No fue posible conectar Google Calendar.",
                empleadoId
            )
        );
    }
}

module.exports = {
    conectarCalendar,
    callbackCalendar
};