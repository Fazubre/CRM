# CRM Voyager

CRM Voyager es una aplicación web desarrollada con **Node.js**, **Express**, **Firebase Firestore** y **Google OAuth**, orientada a la gestión interna de tickets, clientes, empleados, áreas de trabajo y calendario.

## Tabla de contenidos

- [Descripcion general](#descripcion-general)
- [Caracteristicas principales](#caracteristicas-principales)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Rutas principales del backend](#rutas-principales-backend)
- [Modulos del frontend](#modulos-frontend)
- [Flujo basico del sistema](#flujo-basico)
- [Estado actual del proyecto](#estado-actual)
- [Mejoras futuras](#mejoras-futuras)
- [Autor](#autor)

<a name="descripcion-general"></a>

## Descripcion general

El proyecto **CRM Voyager** busca centralizar la administración de clientes, empleados y tickets dentro de una misma plataforma. La aplicación permite organizar solicitudes de trabajo, asignarlas a empleados, relacionarlas con clientes, clasificarlas por áreas, sincronizarlas con Google Calendar y consultar información desde vistas específicas del frontend.

El sistema está construido con una arquitectura dividida en dos carpetas principales:

- **Backend:** contiene la lógica del servidor, controladores, modelos, rutas, servicios y configuración de Firebase.
- **Frontend:** contiene las vistas HTML, componentes reutilizables, estilos CSS, scripts JavaScript e imágenes del sistema.

<a name="caracteristicas-principales"></a>

## Caracteristicas principales

- Inicio de sesión mediante Google OAuth.
- Gestión de tickets.
- Gestión de clientes.
- Gestión de empleados.
- Gestión de áreas internas de trabajo.
- Integración con Google Calendar.
- Uso de Firebase Firestore como base de datos.
- Separación de lógica por controladores, modelos, rutas y servicios.
- Frontend modular con componentes HTML para modales.
- Diseño basado en HTML, CSS, JavaScript, Bootstrap y Font Awesome.

<a name="tecnologias-utilizadas"></a>

## Tecnologias utilizadas

### Backend

- Node.js
- Express.js
- Firebase Admin SDK
- Google OAuth
- Google Calendar API
- dotenv
- CORS

### Frontend

- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Font Awesome
- Google Identity Services

### Base de datos y servicios externos

- Firebase Firestore
- Google Cloud Console
- Google OAuth 2.0
- Google Calendar API

<a name="estructura-del-proyecto"></a>

## Estructura del proyecto

```text
CRM/
├── Backend/
│   ├── controllers/
│   │   ├── Area.controller.js
│   │   ├── Calendar.controller.js
│   │   ├── Client.controller.js
│   │   ├── Employee.controller.js
│   │   └── Ticket.controller.js
│   │
│   ├── models/
│   │   ├── Area.model.js
│   │   ├── Calendar.model.js
│   │   ├── Client.model.js
│   │   ├── Employee.model.js
│   │   └── Ticket.model.js
│   │
│   ├── node_modules/
│   │
│   ├── routes/
│   │   ├── Area.route.js
│   │   ├── Calendar.route.js
│   │   ├── Client.route.js
│   │   ├── Employee.route.js
│   │   └── Ticket.route.js
│   │
│   ├── services/
│   │   ├── Firebase.js
│   │   ├── GoogleCalendar.js
│   │   └── GoogleLogIn.js
│   │
│   ├── src/
│   │   ├── SeedAreas.js
│   │   ├── SeedFirestore.js
│   │   └── index.js
│   │
│   ├── package-lock.json
│   └── package.json
│
├── Frontend/
│   ├── Views/
│   │   ├── components/
│   │   │   ├── Clients/
│   │   │   │   ├── modal-add-client.html
│   │   │   │   ├── modal-edit-client.html
│   │   │   │   ├── modal-elimin-client.html
│   │   │   │   └── modal-view-client.html
│   │   │   │
│   │   │   ├── Employees/
│   │   │   │   ├── modal-add-employee.html
│   │   │   │   ├── modal-edit-employee.html
│   │   │   │   ├── modal-status-employee.html
│   │   │   │   └── modal-view-employee.html
│   │   │   │
│   │   │   └── Tickets/
│   │   │       ├── modal-add-ticket.html
│   │   │       ├── modal-edit-ticket.html
│   │   │       └── modal-view-ticket.html
│   │   │
│   │   ├── LogIn.html
│   │   ├── calendar.html
│   │   ├── clients.html
│   │   ├── dashboard.html
│   │   ├── employee.html
│   │   └── tickets.html
│   │
│   ├── css/
│   │   ├── LogIn.css
│   │   └── dashboard.css
│   │
│   ├── images/
│   │   ├── Logo Voyager Blanco.svg
│   │   └── Logo Voyager.svg
│   │
│   ├── js/
│   │   ├── calendar.js
│   │   ├── clients.js
│   │   ├── dashboard.js
│   │   ├── employee.js
│   │   ├── logIn.js
│   │   └── tickets.js
│   │
│   ├── .gitignore
│   ├── README.md
│   └── package.json
```

<a name="rutas-principales-backend"></a>

## Rutas principales del backend

### Autenticacion

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/auth/google` | Valida el inicio de sesion mediante Google. |

### Tickets

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/tickets` | Obtiene la lista de tickets. |
| POST | `/tickets` | Crea un nuevo ticket. |
| PUT | `/tickets/:id` | Actualiza un ticket existente. |
| DELETE | `/tickets/:id` | Elimina o cambia el estado de un ticket, segun la logica configurada. |

### Clientes

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/clients` | Obtiene la lista de clientes. |
| POST | `/clients` | Registra un nuevo cliente. |
| PUT | `/clients/:id` | Actualiza la informacion de un cliente. |
| DELETE | `/clients/:id` | Elimina o desactiva un cliente. |

### Empleados

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/employees` | Obtiene la lista de empleados. |
| POST | `/employees` | Registra un nuevo empleado. |
| PUT | `/employees/:id` | Actualiza la informacion de un empleado. |
| DELETE | `/employees/:id` | Elimina, desactiva o cambia el estado de un empleado. |

### Areas

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/areas` | Obtiene las areas disponibles del sistema. |
| POST | `/areas` | Crea una nueva area, si la ruta esta habilitada. |

### Calendario

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/calendar` | Consulta eventos del calendario. |
| POST | `/calendar` | Crea eventos o registra informacion relacionada con Google Calendar. |

<a name="modulos-frontend"></a>

## Modulos del frontend

### Login

La vista `LogIn.html` permite el acceso al sistema mediante Google. También incluye campos tradicionales de correo y contraseña, aunque estos pueden mantenerse como estructura visual o activarse en una fase posterior.

Archivos relacionados:

- `Frontend/Views/LogIn.html`
- `Frontend/css/LogIn.css`
- `Frontend/js/logIn.js`

### Dashboard

La vista `dashboard.html` funciona como pantalla principal después del inicio de sesión. Contiene el header, el menú lateral y el área principal de contenido.

Archivos relacionados:

- `Frontend/Views/dashboard.html`
- `Frontend/css/dashboard.css`
- `Frontend/js/dashboard.js`

### Tickets

La vista de tickets permite consultar, crear, editar y visualizar tickets mediante modales reutilizables.

Archivos relacionados:

- `Frontend/Views/tickets.html`
- `Frontend/js/tickets.js`
- `Frontend/Views/components/Tickets/modal-add-ticket.html`
- `Frontend/Views/components/Tickets/modal-edit-ticket.html`
- `Frontend/Views/components/Tickets/modal-view-ticket.html`

### Clientes

La vista de clientes administra la información de empresas o contactos registrados dentro del CRM.

Archivos relacionados:

- `Frontend/Views/clients.html`
- `Frontend/js/clients.js`
- `Frontend/Views/components/Clients/modal-add-client.html`
- `Frontend/Views/components/Clients/modal-edit-client.html`
- `Frontend/Views/components/Clients/modal-elimin-client.html`
- `Frontend/Views/components/Clients/modal-view-client.html`

### Empleados

La vista de empleados permite administrar los colaboradores que pueden recibir tickets o tareas.

Archivos relacionados:

- `Frontend/Views/employee.html`
- `Frontend/js/employee.js`
- `Frontend/Views/components/Employees/modal-add-employee.html`
- `Frontend/Views/components/Employees/modal-edit-employee.html`
- `Frontend/Views/components/Employees/modal-status-employee.html`
- `Frontend/Views/components/Employees/modal-view-employee.html`

### Calendario

La vista de calendario se relaciona con la integración de Google Calendar para organizar eventos, reuniones o fechas asociadas al trabajo del CRM.

Archivos relacionados:

- `Frontend/Views/calendar.html`
- `Frontend/js/calendar.js`
- `Backend/services/GoogleCalendar.js`
- `Backend/controllers/Calendar.controller.js`
- `Backend/models/Calendar.model.js`
- `Backend/routes/Calendar.route.js`

<a name="flujo-basico"></a>

## Flujo basico del sistema

1. El usuario ingresa a la vista de login.
2. El usuario inicia sesión con Google.
3. El frontend envía el token de Google al backend.
4. El backend valida el token con Google OAuth.
5. Si el token es correcto, el sistema obtiene los datos del usuario.
6. El usuario puede ingresar al dashboard.
7. Desde el dashboard puede navegar hacia tickets, clientes, empleados y calendario.
8. Las vistas consumen las rutas del backend para consultar o modificar información en Firestore.

<a name="estado-actual"></a>

## Estado actual del proyecto

Actualmente el proyecto cuenta con una base funcional para:

- Login con Google.
- Estructura backend organizada por controladores, modelos, rutas y servicios.
- Conexión con Firebase Firestore.
- Vistas principales del sistema.
- Modales separados por entidad.
- Scripts independientes para tickets, clientes, empleados, calendario y dashboard.
- Archivos de estilos separados para login y dashboard.

<a name="mejoras-futuras"></a>

## Mejoras futuras

Algunas mejoras recomendadas para próximas fases son:

- Guardar la sesión del usuario después del login.
- Redirigir automáticamente al dashboard después de iniciar sesión.
- Proteger las vistas internas si el usuario no está autenticado.
- Agregar roles de usuario, por ejemplo administrador, empleado o supervisor.
- Centralizar componentes repetidos como header y sidebar.
- Agregar validaciones más estrictas en formularios.
- Mejorar el manejo de errores del frontend.
- Agregar documentación técnica de cada endpoint.
- Implementar pruebas básicas para rutas críticas del backend.
- Preparar configuración de despliegue para Render u otra plataforma.

<a name="autor"></a>

## Autor

Proyecto desarrollado por **Fabian Zúñiga** como parte del desarrollo de un CRM para Voyager Comunicación.
