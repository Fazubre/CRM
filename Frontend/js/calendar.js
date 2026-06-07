const BACKEND_URL = "https://crm-c40k.onrender.co";

window.addEventListener("load", async () => {
    configurarEstadoInicial();
    await cargarEmpleadosCalendar();
    configurarBotonConectar();
});

function configurarEstadoInicial() {
    const params = new URLSearchParams(window.location.search);

    const estado = params.get("estado");
    const mensaje = params.get("mensaje");
    const correo = params.get("correo");

    const calendarStatus = document.getElementById("calendarStatus");

    if (!calendarStatus) return;

    if (estado === "ok") {
        calendarStatus.className = "alert alert-success";
        calendarStatus.textContent = correo
            ? `Google Calendar conectado correctamente con ${correo}.`
            : "Google Calendar conectado correctamente.";
        return;
    }

    if (estado === "error") {
        calendarStatus.className = "alert alert-danger";
        calendarStatus.textContent = mensaje || "No fue posible conectar Google Calendar.";
        return;
    }

    calendarStatus.className = "alert alert-info";
    calendarStatus.textContent = "Selecciona un empleado para conectar su Google Calendar.";
}

async function cargarEmpleadosCalendar() {
    const selectEmpleado = document.getElementById("selectEmpleadoCalendar");
    const calendarStatus = document.getElementById("calendarStatus");

    if (!selectEmpleado) return;

    try {
        const response = await fetch(`${BACKEND_URL}/employees`);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible cargar los empleados.");
        }

        selectEmpleado.innerHTML = `<option value="">Seleccione un empleado</option>`;

        data.employees.forEach((empleado) => {
            const option = document.createElement("option");

            option.value = empleado.id;
            option.textContent = empleado.nombre || empleado.correo || empleado.id;

            selectEmpleado.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando empleados:", error);

        selectEmpleado.innerHTML = `<option value="">Error al cargar empleados</option>`;

        if (calendarStatus) {
            calendarStatus.className = "alert alert-danger";
            calendarStatus.textContent = error.message;
        }
    }
}

function configurarBotonConectar() {
    const btnConectarCalendar = document.getElementById("btnConectarCalendar");
    const selectEmpleado = document.getElementById("selectEmpleadoCalendar");
    const calendarStatus = document.getElementById("calendarStatus");

    if (!btnConectarCalendar || !selectEmpleado) return;

    btnConectarCalendar.addEventListener("click", () => {
        const empleadoId = selectEmpleado.value;

        if (!empleadoId) {
            if (calendarStatus) {
                calendarStatus.className = "alert alert-warning";
                calendarStatus.textContent = "Primero debes seleccionar un empleado.";
            }

            return;
        }

        window.location.href = `${BACKEND_URL}/calendar/conectar?empleadoId=${encodeURIComponent(empleadoId)}`;
    });
}