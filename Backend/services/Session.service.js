const crypto = require("crypto");

const {
    db
} = require("./Firebase");

const SESSION_COOKIE_NAME =
    "crm_session";

const configuredHours =
    Number(
        process.env
            .SESSION_DURATION_HOURS ||
        8
    );

const SESSION_DURATION_HOURS =
    Number.isFinite(
        configuredHours
    ) &&
    configuredHours >
        0
        ? configuredHours
        : 8;

const SESSION_DURATION_MS =
    SESSION_DURATION_HOURS *
    60 *
    60 *
    1000;

function isProductionEnvironment() {
    return (
        process.env.NODE_ENV ===
            "production" ||
        process.env.RENDER ===
            "true"
    );
}

function hashSessionToken(
    token
) {
    return crypto
        .createHash(
            "sha256"
        )
        .update(
            token
        )
        .digest(
            "hex"
        );
}

function getCookieValue(
    req,
    cookieName
) {
    const cookieHeader =
        req.headers.cookie ||
        "";

    const cookies =
        cookieHeader
            .split(
                ";"
            )
            .map(
                (
                    cookie
                ) => {
                    return cookie.trim();
                }
            )
            .filter(
                Boolean
            );

    for (
        const cookie
        of cookies
    ) {
        const separatorIndex =
            cookie.indexOf(
                "="
            );

        if (
            separatorIndex ===
            -1
        ) {
            continue;
        }

        const name =
            cookie
                .slice(
                    0,
                    separatorIndex
                )
                .trim();

        const rawValue =
            cookie
                .slice(
                    separatorIndex +
                    1
                )
                .trim();

        if (
            name !==
            cookieName
        ) {
            continue;
        }

        try {
            return decodeURIComponent(
                rawValue
            );
        } catch (error) {
            return "";
        }
    }

    return "";
}

function getSessionTokenFromRequest(
    req
) {
    return getCookieValue(
        req,
        SESSION_COOKIE_NAME
    );
}

function getSessionCookieAttributes() {
    /*
     * En Render la cookie debe poder viajar
     * desde voyager-cr.com hacia onrender.com.
     */
    if (
        isProductionEnvironment()
    ) {
        return [
            "SameSite=None",
            "Secure"
        ];
    }

    /*
     * En localhost se conserva Lax,
     * porque Secure requiere HTTPS.
     */
    return [
        "SameSite=Lax"
    ];
}

function serializeSessionCookie(
    token,
    maxAgeSeconds
) {
    const cookieParts = [
        (
            `${SESSION_COOKIE_NAME}=` +
            `${encodeURIComponent(token)}`
        ),

        "Path=/",
        "HttpOnly",

        (
            `Max-Age=` +
            `${maxAgeSeconds}`
        ),

        "Priority=High",

        ...getSessionCookieAttributes()
    ];

    return cookieParts.join(
        "; "
    );
}

function setSessionCookie(
    res,
    token
) {
    const maxAgeSeconds =
        Math.floor(
            SESSION_DURATION_MS /
            1000
        );

    res.append(
        "Set-Cookie",

        serializeSessionCookie(
            token,
            maxAgeSeconds
        )
    );
}

function clearSessionCookie(
    res
) {
    /*
     * Para eliminar la cookie hay que usar
     * los mismos atributos utilizados al crearla.
     */
    const cookieParts = [
        `${SESSION_COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        "Max-Age=0",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",

        ...getSessionCookieAttributes()
    ];

    res.append(
        "Set-Cookie",
        cookieParts.join(
            "; "
        )
    );
}

async function createSession(
    employeeId,
    req
) {
    if (!employeeId) {
        throw new Error(
            "No se recibió el ID del empleado para crear la sesión."
        );
    }

    const token =
        crypto
            .randomBytes(
                48
            )
            .toString(
                "base64url"
            );

    const sessionId =
        hashSessionToken(
            token
        );

    const createdAt =
        new Date();

    const expiresAt =
        new Date(
            createdAt.getTime() +
            SESSION_DURATION_MS
        );

    await db
        .collection(
            "sessions"
        )
        .doc(
            sessionId
        )
        .set({
            employeeId:
                String(
                    employeeId
                ),

            createdAt,

            expiresAt,

            userAgent:
                req.get(
                    "user-agent"
                ) ||
                ""
        });

    return {
        token,
        sessionId,
        expiresAt
    };
}

function convertToDate(
    value
) {
    if (!value) {
        return null;
    }

    if (
        typeof value.toDate ===
        "function"
    ) {
        return value.toDate();
    }

    const date =
        new Date(
            value
        );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}

async function getSessionFromRequest(
    req
) {
    const token =
        getSessionTokenFromRequest(
            req
        );

    if (!token) {
        return null;
    }

    const sessionId =
        hashSessionToken(
            token
        );

    const sessionRef =
        db
            .collection(
                "sessions"
            )
            .doc(
                sessionId
            );

    const sessionSnapshot =
        await sessionRef.get();

    if (
        !sessionSnapshot.exists
    ) {
        return null;
    }

    const sessionData =
        sessionSnapshot.data();

    const expiresAt =
        convertToDate(
            sessionData.expiresAt
        );

    if (
        !expiresAt ||
        expiresAt.getTime() <=
            Date.now()
    ) {
        await sessionRef.delete();

        return null;
    }

    return {
        id:
            sessionSnapshot.id,

        ...sessionData,

        expiresAt
    };
}

async function deleteSessionById(
    sessionId
) {
    if (!sessionId) {
        return;
    }

    await db
        .collection(
            "sessions"
        )
        .doc(
            sessionId
        )
        .delete();
}

async function deleteSessionFromRequest(
    req
) {
    const token =
        getSessionTokenFromRequest(
            req
        );

    if (!token) {
        return;
    }

    const sessionId =
        hashSessionToken(
            token
        );

    await deleteSessionById(
        sessionId
    );
}

module.exports = {
    createSession,
    getSessionFromRequest,
    deleteSessionById,
    deleteSessionFromRequest,
    setSessionCookie,
    clearSessionCookie
};