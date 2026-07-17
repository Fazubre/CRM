const { db } = require("../services/Firebase");

const {
    getSessionFromRequest,
    deleteSessionById,
    clearSessionCookie
} = require("../services/Session.service");

function isEmployeeActive(employee) {
    if (!employee) {
        return false;
    }

    if (employee.activo === false) {
        return false;
    }

    const estado = String(
        employee.estado ||
        employee.status ||
        ""
    )
        .trim()
        .toLowerCase();

    const estadosInactivos = [
        "inactivo",
        "inactive",
        "deshabilitado",
        "disabled",
        "bloqueado",
        "blocked"
    ];

    return !estadosInactivos.includes(
        estado
    );
}

function getEmployeeRole(employee) {
    if (!employee) {
        return "";
    }

    if (
        Array.isArray(
            employee.roles
        )
    ) {
        const rolesNormalizados =
            employee.roles.map(
                (role) =>
                    String(role || "")
                        .trim()
                        .toLowerCase()
            );

        if (
            rolesNormalizados.includes(
                "admin"
            )
        ) {
            return "admin";
        }

        return (
            rolesNormalizados[0] ||
            ""
        );
    }

    return String(
        employee.rol ||
        employee.role ||
        employee.tipoRol ||
        employee.tipo_usuario ||
        ""
    )
        .trim()
        .toLowerCase();
}

function getPublicEmployee(employee) {
    return {
        id:
            employee.id || "",

        google_id:
            employee.google_id ||
            "",

        nombre:
            employee.nombre ||
            employee.name ||
            "",

        correo:
            employee.correo ||
            employee.email ||
            "",

        foto_url:
            employee.foto_url ||
            employee.picture ||
            "",

        rol:
            getEmployeeRole(
                employee
            ),

        activo:
            isEmployeeActive(
                employee
            )
    };
}

async function resolveAuthenticatedEmployee(
    req,
    res
) {
    const session =
        await getSessionFromRequest(
            req
        );

    if (!session) {
        clearSessionCookie(res);
        return null;
    }

    const employeeSnapshot =
        await db
            .collection("employees")
            .doc(
                String(
                    session.employeeId
                )
            )
            .get();

    if (!employeeSnapshot.exists) {
        await deleteSessionById(
            session.id
        );

        clearSessionCookie(res);

        return null;
    }

    const employee = {
        id:
            employeeSnapshot.id,

        ...employeeSnapshot.data()
    };

    if (
        !isEmployeeActive(employee)
    ) {
        await deleteSessionById(
            session.id
        );

        clearSessionCookie(res);

        return null;
    }

    req.authSession =
        session;

    req.user =
        employee;

    return employee;
}

async function requireAuth(
    req,
    res,
    next
) {
    try {
        const employee =
            await resolveAuthenticatedEmployee(
                req,
                res
            );

        if (!employee) {
            return res
                .status(401)
                .json({
                    ok: false,
                    mensaje:
                        "Debe iniciar sesión para acceder a este recurso."
                });
        }

        return next();
    } catch (error) {
        console.error(
            "Error validando autenticación:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,
                mensaje:
                    "No fue posible validar la sesión."
            });
    }
}

async function requirePageAuth(
    req,
    res,
    next
) {
    try {
        const employee =
            await resolveAuthenticatedEmployee(
                req,
                res
            );

        if (employee) {
            return next();
        }

        const acceptsHtml =
            String(
                req.headers.accept ||
                ""
            ).includes(
                "text/html"
            );

        if (acceptsHtml) {
            return res.redirect(
                "/Views/LogIn.html"
            );
        }

        return res
            .status(401)
            .json({
                ok: false,
                mensaje:
                    "La sesión expiró."
            });
    } catch (error) {
        console.error(
            "Error protegiendo página:",
            error
        );

        return res.redirect(
            "/Views/LogIn.html"
        );
    }
}

async function requireAdmin(
    req,
    res,
    next
) {
    try {
        const employee =
            req.user ||
            await resolveAuthenticatedEmployee(
                req,
                res
            );

        if (!employee) {
            return res
                .status(401)
                .json({
                    ok: false,
                    mensaje:
                        "Debe iniciar sesión."
                });
        }

        const role =
            getEmployeeRole(
                employee
            );

        if (role !== "admin") {
            return res
                .status(403)
                .json({
                    ok: false,
                    mensaje:
                        "Esta acción requiere permisos de administrador."
                });
        }

        return next();
    } catch (error) {
        console.error(
            "Error validando administrador:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,
                mensaje:
                    "No fue posible validar los permisos."
            });
    }
}

module.exports = {
    requireAuth,
    requirePageAuth,
    requireAdmin,
    resolveAuthenticatedEmployee,
    isEmployeeActive,
    getEmployeeRole,
    getPublicEmployee
};  