// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { initDb } = require('./database/connection');
const { getSwaggerConfig } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;
const http = require('http');
const { Server } = require('socket.io');

// Crear servidor HTTP
const server = http.createServer(app);

// Configurar Socket.io
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Inicializar base de datos
initDb();

// Configurar Socket.io en el servicio de WhatsApp
const whatsappService = require('./services/whatsappService');
whatsappService.setSocketIO(io);

// Importar rutas
const whatsappRoutes = require('./routes/whatsapp');
const userRoutes = require('./routes/users');
const contactoRoutes = require('./routes/contactos');
const userStatusRoutes = require('./routes/userStatuses');
const etiquetaRoutes = require('./routes/etiquetas');
const supervisionRoutes = require('./routes/supervision');

// Configuración de Swagger
const swaggerSpec = getSwaggerConfig(PORT);

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Servir archivos estáticos del frontend (si existe)
app.use(express.static('public'));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ruta raíz con información de la API
app.get('/', (req, res) => {
    res.json({
        message: 'Whatssy',
        documentation: '/api-docs',
        endpoints: {
            whatsapp: '/api/whatsapp',
            users: '/api/users',
            contactos: '/api/contactos',
            user_statuses: '/api/user-statuses',
            etiquetas: '/api/etiquetas',
            supervision: '/api/supervision',
        },
        env: {
            port: PORT,
        },
    });
});

// Usar rutas
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contactos', contactoRoutes);
app.use('/api/user-statuses', userStatusRoutes);
app.use('/api/etiquetas', etiquetaRoutes);
app.use('/api/supervision', supervisionRoutes);

// Ruta catch-all: servir index.html para todas las rutas que no sean API
// Esto permite que Vue Router maneje las rutas del frontend
app.get('*', (req, res) => {
    // Si la ruta comienza con /api, no servir index.html
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint no encontrado' });
    }
    // Para todas las demás rutas, servir index.html
    res.sendFile(__dirname + '/public/index.html');
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Configurar Socket.io
io.on('connection', (socket) => {
    console.log('✅ Cliente conectado a Socket.io:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado de Socket.io:', socket.id);
    });
});

// Exportar io para usar en otros módulos
app.set('io', io);

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
