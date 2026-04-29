const BACKEND_URL = "https://crm-hyb1.onrender.com";
const GOOGLE_CLIENT_ID = "326785422522-ctg73hai4vun8otcr21qke46mqrtul7q.apps.googleusercontent.com";

let usuarioActual = null;
let googleInicializado = false;

window.addEventListener("load", initPage);

function initPage() {
    disableOtherLoginMethods();
    setupGoogleLoginWithRetry();
}

function disableOtherLoginMethods() {
    const form = document.getElementById("loginForm");
    const appleBtn = document.getElementById("appleBtn");
    const switchAccountBtn = document.getElementById("switchAccountBtn");
    const divider = document.querySelector(".divider");
    const signupLink = document.querySelector(".signup-link");

    if (form) {
        form.style.display = "none";
    }

    if (appleBtn) {
        appleBtn.style.display = "none";
    }

    if (switchAccountBtn) {
        switchAccountBtn.style.display = "none";
    }

    if (divider) {
        divider.style.display = "none";
    }

    if (signupLink) {
        signupLink.style.display = "none";
    }

    showStatus("Use Google Sign-In to access the system.", "info");
}

function setupGoogleLoginWithRetry(intentos = 20) {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.trim() === "") {
        showStatus("Google Client ID is empty.", "error");
        console.error("GOOGLE_CLIENT_ID is empty.");
        return;
    }

    if (!window.google || !google.accounts || !google.accounts.id) {
        if (intentos > 0) {
            setTimeout(() => setupGoogleLoginWithRetry(intentos - 1), 300);
            return;
        }

        showStatus("Google Identity Services did not load correctly.", "error");
        console.error("Google Identity Services did not load.");
        return;
    }

    if (!googleInicializado) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
                ux_mode: "popup"
            });

            googleInicializado = true;
        } catch (error) {
            console.error("Error initializing Google Identity Services:", error);
            showStatus("Could not initialize Google login.", "error");
            return;
        }
    }

    renderGoogleButton();
}

function renderGoogleButton() {
    const container = document.getElementById("googleLoginContainer");

    if (!container) {
        showStatus("Google login container was not found.", "error");
        console.error("Element #googleLoginContainer was not found.");
        return;
    }

    container.innerHTML = "";

    try {
        google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 320
        });

        showStatus("Google login is ready.", "info");
        console.log("Google button rendered correctly.");
    } catch (error) {
        console.error("Error rendering Google button:", error);
        showStatus("Could not render the Google button.", "error");
    }
}

async function handleGoogleResponse(response) {
    try {
        if (!response || !response.credential) {
            throw new Error("Google did not return a valid credential.");
        }

        showStatus("Validating Google login...", "info");

        const respuestaBackend = await fetch(`${BACKEND_URL}/auth/google`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credential: response.credential
            })
        });

        const data = await respuestaBackend.json();

        if (!respuestaBackend.ok || !data.ok) {
            throw new Error(data.mensaje || "Google login failed");
        }

        usuarioActual = data.usuario;
        showSuccess(usuarioActual);
    } catch (error) {
        console.error("Google login error:", error);
        showStatus(error.message || "Unexpected error during Google login.", "error");
    }
}

function googleSignOutLocal() {
    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }

    usuarioActual = null;
}

function showSuccess(usuario) {
    const successMessage = document.getElementById("successMessage");
    const successText = document.getElementById("successText");

    if (successMessage) {
        successMessage.style.display = "block";
    }

    if (successText) {
        const nombre = usuario.nombre || usuario.correo || "user";
        successText.textContent = `Welcome, ${nombre}. Redirecting to your dashboard...`;
    }

    localStorage.setItem("usuarioCRM", JSON.stringify(usuario));

    showStatus("Login successful.", "success");
    console.log("Usuario autenticado:", usuario);

    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 1200);
}

function showStatus(message, type) {
    const statusMessage = document.getElementById("statusMessage");
    if (!statusMessage) return;

    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}