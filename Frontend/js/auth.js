(() => {
    const config =
        window.CRM_CONFIG;

    if (
        !config ||
        !config.API_BASE_URL ||
        !config.LOGIN_URL
    ) {
        console.error(
            "CRM_CONFIG no está disponible. Debes cargar config.js antes de auth.js."
        );

        return;
    }

    const API_BASE_URL =
        String(
            config.API_BASE_URL
        ).replace(
            /\/$/,
            ""
        );

    const LOGIN_URL =
        config.LOGIN_URL;

    const SESSION_URL =
        `${API_BASE_URL}/auth/session`;

    const LOGOUT_URL =
        `${API_BASE_URL}/auth/logout`;

    const API_ORIGIN =
        new URL(
            API_BASE_URL
        ).origin;

    const LOGIN_PATHNAME =
        new URL(
            LOGIN_URL,
            window.location.origin
        ).pathname;

    const SESSION_REQUEST_URL =
        new URL(
            SESSION_URL
        );

    const originalFetch =
        window.fetch.bind(
            window
        );

    function getRequestUrl(
        input
    ) {
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

    function isApiRequest(
        input
    ) {
        const url =
            getRequestUrl(
                input
            );

        if (!url) {
            return false;
        }

        return (
            url.origin ===
            API_ORIGIN
        );
    }

    function isSessionRequest(
        input
    ) {
        const url =
            getRequestUrl(
                input
            );

        if (!url) {
            return false;
        }

        return (
            url.origin ===
                SESSION_REQUEST_URL.origin &&
            url.pathname ===
                SESSION_REQUEST_URL.pathname
        );
    }

    function redirectToLogin() {
        localStorage.removeItem(
            "usuarioCRM"
        );

        if (
            window.location.pathname !==
            LOGIN_PATHNAME
        ) {
            window.location.replace(
                LOGIN_URL
            );
        }
    }

    /*
     * Intercepta las solicitudes hechas con fetch.
     *
     * Cuando la solicitud va hacia el backend
     * de Render, incluye automáticamente la
     * cookie de sesión.
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
                isApiRequest(
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

            /*
             * Si una API protegida devuelve 401,
             * elimina los datos locales y envía
             * al usuario al login.
             *
             * La consulta /auth/session se excluye
             * porque validateSession se encarga
             * directamente de ese caso.
             */
            if (
                response.status ===
                    401 &&
                !isSessionRequest(
                    input
                )
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
                        method:
                            "GET",

                        credentials:
                            "include",

                        cache:
                            "no-store",

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

            const contentType =
                response.headers.get(
                    "content-type"
                ) ||
                "";

            if (
                !contentType.includes(
                    "application/json"
                )
            ) {
                console.error(
                    "La ruta /auth/session no devolvió JSON."
                );

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
             * localStorage se usa solamente
             * para mostrar información en la interfaz.
             *
             * La autorización real se valida
             * en el backend mediante la sesión.
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
                    method:
                        "POST",

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
            (
                button
            ) => {
                if (
                    button.dataset
                        .crmLogoutConfigured ===
                    "true"
                ) {
                    return;
                }

                button.dataset
                    .crmLogoutConfigured =
                    "true";

                button.addEventListener(
                    "click",
                    async (
                        event
                    ) => {
                        event.preventDefault();

                        await logout();
                    }
                );
            }
        );
    }

    async function initializeAuth() {
        /*
         * Este archivo se debe cargar únicamente
         * en las páginas privadas del CRM.
         */
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

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeAuth,
            {
                once:
                    true
            }
        );
    } else {
        initializeAuth();
    }

    window.CRMAuth = {
        validateSession,
        logout,
        redirectToLogin
    };
})();