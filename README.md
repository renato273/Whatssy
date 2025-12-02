# 📱 Whatssy

API REST para interactuar con WhatsApp utilizando **Baileys** y **Express**. Permite enviar y recibir mensajes, con almacenamiento en base de datos SQLite y documentación Swagger integrada.

## 🚀 Características

- 📷 **Generación de código QR** para la autenticación de WhatsApp Web
- 📥 **Recepción y almacenamiento** de mensajes entrantes en base de datos
- ✉️ **Envío de mensajes** a números de WhatsApp con validación de API key
- 💾 **Base de datos SQLite** para almacenar mensajes enviados y recibidos
- 📊 **Historial de conversaciones** por número de teléfono
- 🔐 **Autenticación por API key** para endpoints protegidos
- 👥 **Gestión de usuarios y contactos** con autenticación
- 🎨 **Frontend Vue.js** con interfaz de chat moderna
- 📚 **Documentación Swagger** interactiva en `/api-docs`
- 🔄 **Reconexión automática** en caso de desconexión
- 💾 **Persistencia de sesión** - no necesitas escanear el QR en cada reinicio

## 📋 Requisitos

- 🟢 Node.js (v14 o superior)
- 📦 npm o yarn

## 🛠️ Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/ramiroec/whatsapp-web-api.git
   ```

2. Navega al directorio del proyecto:
   ```bash
   cd whatsapp-web-api
   ```

3. Instala las dependencias:
   ```bash
   npm install
   ```

4. Configura las variables de entorno:
   ```bash
   cp env.example .env
   ```
   
   Edita el archivo `.env` y configura:
   ```env
   PORT=3000
   API_KEY=tu_api_key_super_secreta_aqui
   ```

## 🚀 Uso

### Iniciar el servidor

```bash
npm start
# o
npm run dev
```

El servidor estará disponible en `http://localhost:3000` y el frontend en la misma URL.

### Acceder al Frontend

1. Abre tu navegador y ve a `http://localhost:3000`
2. Inicia sesión con tus credenciales de usuario
3. Una vez autenticado, podrás:
   - Ver y gestionar tus contactos
   - Enviar y recibir mensajes de WhatsApp
   - Ver el historial de conversaciones

### Primera conexión

1. Al iniciar el servidor, se generará un código QR en la terminal
2. Abre WhatsApp en tu teléfono
3. Ve a **Configuración > Dispositivos vinculados**
4. Toca **"Vincular un dispositivo"**
5. Escanea el código QR que aparece en la terminal
6. ¡Listo! La sesión se guardará automáticamente para futuros reinicios

## 📡 Endpoints

### Base URL
```
http://localhost:3000
```

### Documentación Swagger
Accede a la documentación interactiva en:
```
http://localhost:3000/api-docs
```

### 1. Enviar un mensaje

**POST** `/api/whatsapp/send`

Requiere autenticación mediante API key en el header `x-api-key`.

**Headers:**
```
x-api-key: tu_api_key_super_secreta_aqui
Content-Type: application/json
```

**Body:**
```json
{
  "numeroDestino": "595994709128",
  "mensaje": "Hola, este es un mensaje de prueba"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Mensaje enviado",
  "response": { ... }
}
```

**Errores:**
- `400`: Faltan parámetros requeridos
- `401`: API key inválida o no proporcionada
- `503`: Cliente de WhatsApp no está listo
- `500`: Error al enviar el mensaje

### 2. Obtener mensajes de un número

**GET** `/api/whatsapp/messages?numero=595994709128`

Obtiene todos los mensajes (enviados y recibidos) de un número específico, ordenados cronológicamente.

**Query Parameters:**
- `numero` (requerido): Número de teléfono (con o sin `@s.whatsapp.net`)

**Ejemplo:**
```bash
GET /api/whatsapp/messages?numero=595994709128
```

**Respuesta (200):**
```json
{
  "numero": "595994709128",
  "total": 10,
  "messages": [
    {
      "id": 1,
      "numero": "595994709128",
      "body": "Hola",
      "timestamp": 1234567890000,
      "created_at": "2024-01-01 10:00:00",
      "type": "sent",
      "status": "SUCCESS"
    },
    {
      "id": 2,
      "numero": "595994709128@s.whatsapp.net",
      "body": "Hola, ¿cómo estás?",
      "timestamp": 1234567891000,
      "created_at": "2024-01-01 10:01:00",
      "type": "received",
      "payload": { ... }
    }
  ]
}
```

### 3. Login de usuario

**POST** `/api/users/login`

Inicia sesión con correo y contraseña.

**Body:**
```json
{
  "correo": "juan.perez@example.com",
  "contraseña": "miPassword123"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "correo": "juan.perez@example.com",
    "estado": "activo"
  },
  "apiKey": "tu_api_key_super_secreta_aqui"
}
```

### 4. Obtener contactos

**GET** `/api/contactos`

Obtiene todos los contactos registrados.

**Respuesta (200):**
```json
{
  "contactos": [
    {
      "id": 1,
      "nombre_contacto": "Juan Pérez",
      "numero": "595994709128",
      "observacion": "Cliente importante",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
}
```

### 5. Crear contacto

**POST** `/api/contactos`

Crea un nuevo contacto.

**Body:**
```json
{
  "nombre_contacto": "Juan Pérez",
  "numero": "595994709128",
  "observacion": "Cliente importante",
  "created_by": 1
}
```

### 6. Obtener código QR

**GET** `/api/whatsapp/qr`

Obtiene el último código QR disponible para vincular WhatsApp Web.

**Respuesta exitosa (200):**
```json
{
  "qr": "código_qr_en_formato_string"
}
```

**Respuesta si no hay QR (404):**
```json
{
  "error": "No hay un QR disponible actualmente"
}
```

## 🗂️ Estructura del Proyecto

```
whatsapp-web-api/
├── app.js                    # Punto de entrada principal
├── package.json
├── .env                      # Variables de entorno (no incluido en git)
├── messages.db              # Base de datos SQLite
│
├── config/                  # Configuraciones
│   └── swagger.js          # Configuración de Swagger
│
├── database/                # Base de datos
│   └── connection.js       # Conexión y funciones de SQLite
│
├── routes/                  # Rutas
│   ├── whatsapp.js         # Rutas de WhatsApp
│   ├── users.js            # Rutas de usuarios
│   └── contactos.js        # Rutas de contactos
│
├── controllers/             # Controladores (lógica de endpoints)
│   ├── whatsappController.js
│   ├── userController.js
│   └── contactoController.js
│
├── middleware/              # Middlewares personalizados
│   └── validateApiKey.js   # Validación de API key
│
├── services/                # Servicios (lógica de negocio)
│   └── whatsappService.js  # Cliente de WhatsApp y funciones relacionadas
│
└── public/                  # Frontend Vue.js
    ├── index.html          # Página principal
    ├── js/
    │   ├── main.js         # Aplicación Vue principal
    │   └── api.js          # Servicios de API
    └── css/
        └── style.css       # Estilos
```

## 💾 Base de Datos

El proyecto utiliza SQLite para almacenar:

### Tabla: `sent_messages`
Almacena todos los mensajes enviados a través de la API.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID único (auto-incremental) |
| numero_destino | TEXT | Número de destino (formato: `595994709128`) |
| mensaje | TEXT | Contenido del mensaje |
| status | TEXT | Estado: `SUCCESS` o `ERROR` |
| error_message | TEXT | Mensaje de error (si aplica) |
| created_at | DATETIME | Fecha y hora de creación |

### Tabla: `received_messages`
Almacena todos los mensajes recibidos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID único (auto-incremental) |
| message_id | TEXT | ID único del mensaje de WhatsApp |
| from_number | TEXT | Número del remitente (formato: `595994709128@s.whatsapp.net`) |
| message_body | TEXT | Contenido del mensaje |
| timestamp | INTEGER | Timestamp del mensaje |
| payload | TEXT | JSON completo del mensaje |
| created_at | DATETIME | Fecha y hora de creación |

## 🔐 Seguridad

- **API Key**: El endpoint de envío de mensajes requiere una API key válida en el header `x-api-key`
- **Variables de entorno**: Las credenciales sensibles se almacenan en `.env` (no incluido en git)
- **Sesión persistente**: La sesión de WhatsApp se guarda en `.baileys_auth` (no incluido en git)

## 📚 Tecnologías Utilizadas

- **[Baileys](https://github.com/WhiskeySockets/Baileys)**: Librería para interactuar con WhatsApp
- **[Express](https://expressjs.com/)**: Framework web para Node.js
- **[SQLite3](https://www.sqlite.org/)**: Base de datos SQLite
- **[Vue.js](https://vuejs.org/)**: Framework frontend para la interfaz de usuario
- **[Vue Router](https://router.vuejs.org/)**: Enrutador para Vue.js
- **[Axios](https://axios-http.com/)**: Cliente HTTP para peticiones API
- **[Swagger](https://swagger.io/)**: Documentación de API
- **[dotenv](https://github.com/motdotla/dotenv)**: Gestión de variables de entorno

## 🐛 Solución de Problemas

### El cliente no se conecta
- Verifica que hayas escaneado el QR correctamente
- Si el problema persiste, elimina la carpeta `.baileys_auth` y reinicia el servidor

### Error 515 (Stream Errored)
- Es un error temporal común en Baileys
- El sistema se reconectará automáticamente
- Si persiste, reinicia el servidor

### Error al enviar mensajes
- Verifica que el cliente esté conectado (debe aparecer "✅ WhatsApp Web conectado exitosamente")
- Verifica que la API key sea correcta
- Verifica que el número de destino tenga el formato correcto (sin espacios ni caracteres especiales)

## 📜 Licencia

Este proyecto se encuentra bajo la licencia MIT.

## 🤝 Contribuciones

Si deseas contribuir a este proyecto, por favor, crea un pull request con tus cambios.

## 🌟 Créditos


---

**Nota**: Este proyecto utiliza Baileys, una librería no oficial para interactuar con WhatsApp. Úsalo bajo tu propia responsabilidad y respetando los términos de servicio de WhatsApp.
