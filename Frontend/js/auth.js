(() => {
    const LOGIN_URL =
        "/Views/LogIn.html";

    const SESSION_URL =
        "/auth/session";

    const LOGOUT_URL =
        "/auth/logout";

    const originalFetch =
        window.fetch.bind(window);

    function getRequestUrl(input) {
        try {
            const value =
                typeof input ===
                "string"
                    ? input
                    : input.url;

            return new URL(
                value,
                window.location.href
            );
        } catch (error) {
            return null;
        }
    }

    function isSameOriginRequest(
        input
    ) {
        const url =
            getRequestUrl(input);

        return (
            url?.origin ===
            window.location.origin
        );
    }

    function isSessionRequest(
        input
    ) {
        const url =
            getRequestUrl(input);

        return (
            url?.pathname ===
            SESSION_URL
        );
    }

    function redirectToLogin() {
        localStorage.removeItem(
            "usuarioCRM"
        );

        if (
            window.location.pathname !==
            LOGIN_URL
        ) {
            window.location.replace(
                LOGIN_URL
            );
        }
    }

    /*
     * Hace que las solicitudes existentes
     * incluyan la cookie automáticamente.
     */
    window.fetch =
        async function (
            input,
            options = {}
        ) {
            const requestOptions = {
                ...options
            };

            if (
                isSameOriginRequest(
                    input
                ) &&
                requestOptions.credentials ===
                    undefined
            ) {
                requestOptions.credentials =
                    "include";
            }

            const response =
                await originalFetch(
                    input,
                    requestOptions
                );

            if (
                response.status === 401 &&
                !isSessionRequest(input)
            ) {
                redirectToLogin();
            }

            return response;
        };

    async function validateSession() {
        try {
            const response =
                await originalFetch(
                    SESSION_URL,
                    {
                        method: "GET",
                        credentials:
                            "include",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            if (!response.ok) {
                redirectToLogin();
                return null;
            }

            const data =
                await response.json();

            if (
                !data.ok ||
                !data.usuario
            ) {
                redirectToLogin();
                return null;
            }

            /*
             * localStorage se mantiene únicamente
             * para mostrar datos en la interfaz.
             *
             * No se utiliza para autorizar acciones.
             */
            localStorage.setItem(
                "usuarioCRM",
                JSON.stringify(
                    data.usuario
                )
            );

            return data.usuario;
        } catch (error) {
            console.error(
                "Error validando sesión:",
                error
            );

            redirectToLogin();

            return null;
        }
    }

    async function logout() {
        try {
            await originalFetch(
                LOGOUT_URL,
                {
                    method: "POST",
                    credentials:
                        "include",

                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );
        } catch (error) {
            console.error(
                "Error cerrando sesión:",
                error
            );
        } finally {
            localStorage.removeItem(
                "usuarioCRM"
            );

            window.location.replace(
                LOGIN_URL
            );
        }
    }

    function configureLogoutButtons() {
        const logoutButtons =
            document.querySelectorAll(
                "#btnCerrarSesion, [data-crm-logout]"
            );

        logoutButtons.forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    async (event) => {
                        event.preventDefault();

                        await logout();
                    }
                );
            }
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        async () => {
            const user =
                await validateSession();

            if (!user) {
                return;
            }

            configureLogoutButtons();

            window.dispatchEvent(
                new CustomEvent(
                    "crm:session-ready",
                    {
                        detail: {
                            user
                        }
                    }
                )
            );
        }
    );

    window.CRMAuth = {
        validateSession,
        logout,
        redirectToLogin
    };
})();