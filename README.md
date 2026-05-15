CRM Voyager es una aplicación web orientada a la gestión interna de clientes, tickets, empleados, áreas y calendario.

El proyecto está construido con un backend en Node.js y Express, un frontend en HTML, CSS y JavaScript, y autenticación mediante Google Identity Services.

El objetivo principal del sistema es centralizar el seguimiento de solicitudes, organizar la información operativa de la empresa y permitir que los usuarios ingresen mediante una cuenta de Google autorizada.

## Tabla de contenidos

- [Características principales](#características-principales)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Estructura general del proyecto](#estructura-general-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Instalación local](#instalación-local)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución del proyecto](#ejecución-del-proyecto)
- [Autenticación con Google](#autenticación-con-google)
- [Rutas principales](#rutas-principales)
- [Frontend](#frontend)
- [Estado actual del proyecto](#estado-actual-del-proyecto)
- [Mejoras pendientes](#mejoras-pendientes)

## Características principales

- Inicio de sesión mediante Google.
- Validación del token de Google desde el backend.
- Interfaz de login 
- Dashboard administrativo con header, menú lateral y área principal de contenido.
- Estructura preparada para módulos como tickets, clientes, empleados, áreas y calendario.
- Uso de archivos estáticos desde el frontend.


## Tecnologías utilizadas

### Backend

- Node.js
- Express.js
- google-auth-library
- dotenv
- CORS
- Firebase Admin SDK
- 
### Frontend

- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Font Awesome
- Google Identity Services
- jQuery y jQuery UI en vistas administrativas

## Estructura general del proyecto

```text
CRM/
├── Backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── services/
│   │       └── GoogleLogIn.js
│   │       └── GoogleLogIn.js
│   ├── package.json
│   └── .env
│
├── Frontend/
│   ├── Views/
│   │   ├── LogIn.html
│   │   ├── dashboard.html
│   │   └── components/
│   ├── css/
│   │   ├── LogIn.css
│   │   └── dashboard.css
│   ├── js/
│   │   └── logIn.js
│   └── img/
│
└── README.md
```

Esta estructura puede variar según la organización final del proyecto, pero se recomienda mantener separados los archivos del backend, las vistas, los estilos, los scripts y los componentes reutilizables.

## Requisitos previos

Antes de ejecutar el proyecto, se necesita tener instalado:

- Node.js en una versión reciente.
- npm.
- Una cuenta de Google Cloud Console.
- Un OAuth Client ID configurado para Google Identity Services.
- Una base de datos o servicio de almacenamiento, en caso de usar Firestore.

## Instalación local

1. Clonar el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
cd CRM
```

2. Entrar a la carpeta del backend:

```bash
cd Backend
```

3. Instalar las dependencias:

```bash
npm install
```

4. Crear el archivo `.env` dentro de la carpeta `Backend`.

5. Configurar las variables necesarias.

## Variables de entorno

El backend necesita un archivo `.env` con las credenciales necesarias para ejecutar la autenticación y otros servicios.

Ejemplo:

```env
PORT=3000
GOOGLE_CLIENT_ID=tu_google_client_id

FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu_client_email
FIREBASE_PRIVATE_KEY="tu_private_key"
```

Notas importantes:

- `GOOGLE_CLIENT_ID` debe ser el mismo Client ID utilizado en el frontend.
- Si se usa Firebase Admin SDK, la llave privada debe conservar los saltos de línea correctamente.
- El archivo `.env` no debe subirse al repositorio.

## Ejecución del proyecto

Desde la carpeta del backend, ejecutar:

```bash
npm start
```

También se puede ejecutar directamente con Node:

```bash
node src/index.js
```

Por defecto, el proyecto está pensado para correr en:

```text
http://localhost:3000
```

## Autenticación con Google

El login utiliza Google Identity Services en el frontend. El usuario selecciona una cuenta de Google y el frontend recibe un `credential`. Luego, ese token se envía al backend mediante una petición `POST`.

Flujo general:

1. El frontend renderiza el botón de Google.
2. Google devuelve un token de autenticación.
3. El frontend envía el token a `/auth/google`.
4. El backend valida el token usando `google-auth-library`.
5. Si el token es válido, el backend devuelve los datos básicos del usuario.

Datos devueltos del usuario:

```json
{
  "google_id": "id_google",
  "nombre": "Nombre del usuario",
  "correo": "correo@ejemplo.com",
  "foto_url": "url_de_foto",
  "correo_verificado": true
}
```

## Rutas principales

Las rutas pueden variar según el avance del proyecto, pero la organización esperada es:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Redirige a la vista de login. |
| GET | `/health` | Verifica que la API esté funcionando. |
| GET | `/test` | Ruta de prueba del backend. |
| POST | `/auth/google` | Valida el login con Google. |
| GET | `/tickets` | Obtiene los tickets registrados. |
| POST | `/tickets` | Crea un nuevo ticket. |
| GET | `/clients` | Obtiene los clientes registrados. |
| GET | `/employees` | Obtiene los empleados registrados. |
| GET | `/areas` | Obtiene las áreas disponibles. |
| GET | `/calendar` | Gestiona funciones relacionadas con calendario, si está habilitado. |

## Frontend

### Login

La vista de login contiene:

- Formulario tradicional de correo y contraseña.
- Botón de inicio de sesión con Google.
- Botón para cambiar cuenta de Google.
- Botón de Apple como opción visual todavía no conectada.
- Mensajes de estado para informar errores, validaciones y éxito.

Actualmente, el login clásico por correo y contraseña está preparado en la interfaz, pero no está conectado a un backend real. La opción funcional principal es Google Login.

### Dashboard

El dashboard incluye:

- Header superior fijo.
- Logo del sistema.
- Menú de usuario con opciones de perfil, configuración y cierre de sesión.
- Menú lateral compacto.
- Área principal para cargar contenido administrativo.

El diseño está preparado para funcionar como base visual de los módulos internos del CRM.

## Estado actual del proyecto

El proyecto cuenta con una base funcional para:

- Login con Google desde el frontend.
- Validación del token de Google desde el backend.
- Interfaz de login estilizada.
- Dashboard administrativo base.
- Estilos reutilizables para layout, tablas, botones, formularios, tarjetas y modales.

Algunas funciones visuales existen como placeholders, por ejemplo:

- Login con correo y contraseña.
- Registro de usuario.
- Recuperación de contraseña.
- Login con Apple.

Estas opciones deben conectarse a lógica real si se van a utilizar en producción.

## Mejoras pendientes

- Redirigir automáticamente al dashboard después de un login exitoso.
- Guardar la sesión del usuario en `localStorage`, cookie segura o mecanismo de sesión del backend.
- Proteger rutas internas para evitar acceso sin autenticación.
- Conectar el login clásico de correo y contraseña, si se desea mantener.
- Eliminar botones o enlaces que todavía no tengan funcionalidad real.
- Ajustar el `BACKEND_URL` para producción.
- Mover el `GOOGLE_CLIENT_ID` del frontend a una configuración más fácil de cambiar entre ambientes.
- Completar los módulos de tickets, clientes, empleados, áreas y calendario.
- Agregar documentación técnica de la base de datos.
- Agregar manejo global de errores.
- Agregar pruebas básicas para rutas críticas.

## Recomendaciones para producción

Antes de publicar el proyecto en un servidor como Render, Railway, Vercel o cualquier otro proveedor, se recomienda:

- Configurar correctamente las variables de entorno en el proveedor de hosting.
- Registrar los dominios autorizados en Google Cloud Console.
- Registrar los URI de redirección autorizados, si se usa flujo OAuth con redirect.
- Cambiar `http://localhost:3000` por la URL real del backend.
- Verificar que CORS permita únicamente los dominios necesarios.
- No exponer credenciales privadas dentro del código fuente.
- Usar HTTPS en producción.

## Autor

Proyecto desarrollado como parte del sistema CRM Voyager.

