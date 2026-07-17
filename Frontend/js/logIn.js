const BACKEND_URL =
    window.CRM_CONFIG.API_BASE_URL;

const GOOGLE_CLIENT_ID =
    "578696786769-0sduvu0sni3fpjd258kg8grlm4ss2do8.apps.googleusercontent.com";

let usuarioActual = null;
let googleInicializado = false;

window.addEventListener(
    "load",
    initPage
);

async function initPage() {
    disableOtherLoginMethods();

    const sessionExists =
        await checkExistingSession();

    if (sessionExists) {
        window.location.replace(
            window.CRM_CONFIG.DASHBOARD_URL
        );

        return;
    }

    setupGoogleLoginWithRetry();
}

async function checkExistingSession() {
    try {
        const response =
            await fetch(
                `${BACKEND_URL}/auth/session`,
                {
                    method: "GET",

                    credentials:
                        "include",

                    headers: {
                        Accept:
                            "application/json"
                    },

                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            return false;
        }

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        if (
            !contentType.includes(
                "application/json"
            )
        ) {
            return false;
        }

        const data =
            await response.json();

        if (
            !data.ok ||
            !data.usuario
        ) {
            return false;
        }

        usuarioActual =
            data.usuario;

        localStorage.setItem(
            "usuarioCRM",
            JSON.stringify(
                data.usuario
            )
        );

        return true;
    } catch (error) {
        console.error(
            "No fue posible comprobar la sesión:",
            error
        );

        return false;
    }
}

function disableOtherLoginMethods() {
    const form =
        document.getElementById(
            "loginForm"
        );

    const appleBtn =
        document.getElementById(
            "appleBtn"
        );

    const switchAccountBtn =
        document.getElementById(
            "switchAccountBtn"
        );

    const divider =
        document.querySelector(
            ".divider"
        );

    const signupLink =
        document.querySelector(
            ".signup-link"
        );

    if (form) {
        form.style.display =
            "none";
    }

    if (appleBtn) {
        appleBtn.style.display =
            "none";
    }

    if (switchAccountBtn) {
        switchAccountBtn.style.display =
            "none";
    }

    if (divider) {
        divider.style.display =
            "none";
    }

    if (signupLink) {
        signupLink.style.display =
            "none";
    }

    showStatus(
        "Use Google Sign-In to access the system.",
        "info"
    );
}

function setupGoogleLoginWithRetry(
    intentos = 20
) {
    if (
        !GOOGLE_CLIENT_ID ||
        GOOGLE_CLIENT_ID.trim() ===
            ""
    ) {
        showStatus(
            "Google Client ID is empty.",
            "error"
        );

        console.error(
            "GOOGLE_CLIENT_ID is empty."
        );

        return;
    }

    if (
        !window.google ||
        !window.google.accounts ||
        !window.google.accounts.id
    ) {
        if (intentos > 0) {
            setTimeout(
                () => {
                    setupGoogleLoginWithRetry(
                        intentos - 1
                    );
                },
                300
            );

            return;
        }

        showStatus(
            "Google Identity Services did not load correctly.",
            "error"
        );

        console.error(
            "Google Identity Services did not load."
        );

        return;
    }

    if (!googleInicializado) {
        try {
            window.google.accounts.id.initialize({
                client_id:
                    GOOGLE_CLIENT_ID,

                callback:
                    handleGoogleResponse,

                auto_select:
                    false,

                cancel_on_tap_outside:
                    true,

                ux_mode:
                    "popup"
            });

            googleInicializado =
                true;
        } catch (error) {
            console.error(
                "Error initializing Google Identity Services:",
                error
            );

            showStatus(
                "Could not initialize Google login.",
                "error"
            );

            return;
        }
    }

    renderGoogleButton();
}

function renderGoogleButton() {
    const container =
        document.getElementById(
            "googleLoginContainer"
        );

    if (!container) {
        showStatus(
            "Google login container was not found.",
            "error"
        );

        console.error(
            "Element #googleLoginContainer was not found."
        );

        return;
    }

    container.innerHTML =
        "";

    try {
        window.google.accounts.id.renderButton(
            container,
            {
                theme:
                    "outline",

                size:
                    "large",

                text:
                    "signin_with",

                shape:
                    "rectangular",

                logo_alignment:
                    "left",

                width:
                    320
            }
        );

        showStatus(
            "Google login is ready.",
            "info"
        );

        console.log(
            "Google button rendered correctly."
        );
    } catch (error) {
        console.error(
            "Error rendering Google button:",
            error
        );

        showStatus(
            "Could not render the Google button.",
            "error"
        );
    }
}

async function handleGoogleResponse(
    response
) {
    try {
        if (
            !response ||
            !response.credential
        ) {
            throw new Error(
                "Google did not return a valid credential."
            );
        }

        showStatus(
            "Validating Google login...",
            "info"
        );

        const respuestaBackend =
            await fetch(
                `${BACKEND_URL}/auth/google`,
                {
                    method:
                        "POST",

                    credentials:
                        "include",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Accept:
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            credential:
                                response.credential
                        })
                }
            );

        const contentType =
            respuestaBackend.headers.get(
                "content-type"
            ) || "";

        if (
            !contentType.includes(
                "application/json"
            )
        ) {
            const texto =
                await respuestaBackend.text();

            console.error(
                "Respuesta no JSON del backend:",
                texto
            );

            throw new Error(
                "El backend no devolvió JSON. Revisa la ruta /auth/google."
            );
        }

        const data =
            await respuestaBackend.json();

        if (
            !respuestaBackend.ok ||
            !data.ok
        ) {
            throw new Error(
                data.mensaje ||
                "Google login failed."
            );
        }

        if (!data.usuario) {
            throw new Error(
                "El servidor no devolvió la información del usuario."
            );
        }

        usuarioActual =
            data.usuario;

        showSuccess(
            usuarioActual
        );
    } catch (error) {
        console.error(
            "Google login error:",
            error
        );

        showStatus(
            error.message ||
            "Unexpected error during Google login.",
            "error"
        );
    }
}

function googleSignOutLocal() {
    if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.id
    ) {
        window.google.accounts.id.disableAutoSelect();
    }

    usuarioActual =
        null;

    localStorage.removeItem(
        "usuarioCRM"
    );
}

function showSuccess(usuario) {
    const successMessage =
        document.getElementById(
            "successMessage"
        );

    const successText =
        document.getElementById(
            "successText"
        );

    if (successMessage) {
        successMessage.style.display =
            "block";
    }

    if (successText) {
        const nombre =
            usuario.nombre ||
            usuario.correo ||
            "user";

        successText.textContent =
            `Welcome, ${nombre}. Redirecting to your dashboard...`;
    }

    /*
     * localStorage se utiliza únicamente
     * para mostrar información en la interfaz.
     *
     * La autenticación y los permisos reales
     * se validan desde el backend.
     */
    localStorage.setItem(
        "usuarioCRM",
        JSON.stringify(
            usuario
        )
    );

    showStatus(
        "Login successful.",
        "success"
    );

    console.log(
        "Usuario autenticado:",
        usuario
    );

    setTimeout(
        () => {
            window.location.replace(
                window.CRM_CONFIG.DASHBOARD_URL
            );
        },
        1200
    );
}

function showStatus(
    message,
    type
) {
    const statusMessage =
        document.getElementById(
            "statusMessage"
        );

    if (!statusMessage) {
        return;
    }

    statusMessage.textContent =
        message;

    statusMessage.className =
        `status-message ${type}`;
}