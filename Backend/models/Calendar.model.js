async function getEmployeeCalendarData(empleadoId) {
    const empleado = await getEmployeeById(empleadoId);

    if (!empleado) {
        return null;
    }

    return {
        empleado,
        conectado: empleado.google_calendar?.conectado === true,
        refreshToken: empleado.google_calendar?.refresh_token || "",
        correoGoogle: empleado.google_correo || "",
        nombreGoogle: empleado.google_nombre || ""
    };
}