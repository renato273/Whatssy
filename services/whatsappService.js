const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadMediaMessage,
    getContentType,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const pino = require('pino');
const { saveReceivedMessage, saveMessageAck } = require('../database/connection');
const path = require('path');
const fs = require('fs');
const { writeFile } = require('fs').promises;

let socket = null;
let receivedMessages = []; // Arreglo para almacenar los mensajes recibidos
let latestQr = null; // Último QR recibido
let isReady = false; // Estado de preparación del cliente
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let io = null; // Referencia a Socket.io

// Ruta para guardar la sesión
const authFolder = path.join(__dirname, '..', '.baileys_auth');

// Ruta para guardar archivos multimedia
const mediaFolder = path.join(__dirname, '..', 'public', 'media');

// Asegurar que las carpetas existen
if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
}
if (!fs.existsSync(mediaFolder)) {
    fs.mkdirSync(mediaFolder, { recursive: true });
}

// Logger para Baileys
const logger = pino({ level: 'silent' }); // Cambiar a 'info' o 'debug' para ver más logs

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        const { version } = await fetchLatestBaileysVersion();

        socket = makeWASocket({
            version,
            logger,
            printQRInTerminal: false, // Lo manejaremos nosotros
            auth: state,
            browser: ['Whatssy', 'Chrome', '1.0.0'],
        });

        // Guardar credenciales cuando se actualicen
        socket.ev.on('creds.update', saveCreds);

        // Manejar conexión
        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Generar QR si está disponible
            if (qr) {
                latestQr = qr;
                isReady = false;
                console.log('\n========================================');
                console.log('📱 Escanea el código QR con tu WhatsApp');
                console.log('   1. Abre WhatsApp en tu teléfono');
                console.log('   2. Ve a Configuración > Dispositivos vinculados');
                console.log('   3. Toca "Vincular un dispositivo"');
                console.log('   4. Escanea el código QR que aparece abajo');
                console.log('   (Esta sesión se guardará para futuros reinicios)');
                console.log('========================================\n');

                // Generar QR en terminal
                const qrCode = await qrcode.toString(qr, { type: 'terminal', small: true });
                console.log(qrCode);
                console.log('\n⏳ Esperando escaneo del código QR...\n');
            }

            // Manejar estado de conexión
            if (connection === 'close') {
                const error = lastDisconnect?.error;
                const statusCode = error instanceof Boom ? error?.output?.statusCode : null;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                // Mensajes más amigables según el tipo de error
                if (statusCode === 515) {
                    console.log('\n⚠️  Error temporal de conexión (código 515)');
                    console.log('   Esto es normal y se reconectará automáticamente...\n');
                } else if (statusCode === DisconnectReason.loggedOut) {
                    console.log('\n⚠️  Sesión cerrada. Necesitas escanear el QR nuevamente.\n');
                    // Limpiar la sesión guardada
                    if (fs.existsSync(authFolder)) {
                        fs.rmSync(authFolder, { recursive: true, force: true });
                        console.log('🗑️  Sesión anterior eliminada. Se generará un nuevo QR.\n');
                    }
                } else if (statusCode === DisconnectReason.restartRequired) {
                    console.log('\n⚠️  Reinicio requerido por WhatsApp. Reconectando...\n');
                } else if (statusCode === DisconnectReason.timedOut) {
                    console.log('\n⚠️  Conexión expirada. Reconectando...\n');
                } else {
                    console.log(
                        '\n⚠️  Conexión cerrada. Código:',
                        statusCode || 'desconocido',
                        ', reconectando:',
                        shouldReconnect
                    );
                }

                if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    console.log(`🔄 Intento de reconexión ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...\n`);
                    isReady = false;
                    setTimeout(() => connectToWhatsApp(), 3000);
                } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.log('❌ Se alcanzó el límite de intentos de reconexión.');
                    console.log('   Por favor, reinicia el servidor manualmente.\n');
                    isReady = false;
                } else {
                    console.log('❌ No se puede reconectar. Por favor, reinicia el servidor.\n');
                    isReady = false;
                }
            } else if (connection === 'open') {
                reconnectAttempts = 0;
                isReady = true;
                latestQr = null;
                console.log('\n========================================');
                console.log('✅ ¡WhatsApp Web conectado exitosamente!');
                console.log('✅ El cliente está listo para enviar y recibir mensajes');
                if (socket.user) {
                    console.log(`✅ Conectado como: ${socket.user.name || 'Usuario'}`);
                }
                console.log('========================================\n');
            } else if (connection === 'connecting') {
                console.log('🔄 Conectando a WhatsApp...\n');
            }
        });

        // Manejar mensajes recibidos
        socket.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const message of messages) {
                // Ignorar mensajes de estado
                if (message.key.remoteJid === 'status@broadcast') continue;

                // Detectar tipo de mensaje y extraer información
                const messageType = Object.keys(message.message || {})[0];
                let messageBody = '';
                let mediaInfo = null;

                // Procesar según el tipo de mensaje
                if (messageType === 'conversation') {
                    messageBody = message.message.conversation;
                } else if (messageType === 'extendedTextMessage') {
                    messageBody = message.message.extendedTextMessage.text || '';
                } else if (messageType === 'imageMessage') {
                    const img = message.message.imageMessage;
                    messageBody = img.caption || '[Imagen]';
                    mediaInfo = {
                        type: 'image',
                        mimetype: img.mimetype || 'image/jpeg',
                        filename: img.fileName || `image_${message.key.id}.jpg`,
                        size: img.fileLength || 0,
                    };
                } else if (messageType === 'videoMessage') {
                    const vid = message.message.videoMessage;
                    messageBody = vid.caption || '[Video]';
                    mediaInfo = {
                        type: 'video',
                        mimetype: vid.mimetype || 'video/mp4',
                        filename: vid.fileName || `video_${message.key.id}.mp4`,
                        size: vid.fileLength || 0,
                        seconds: vid.seconds || 0,
                    };
                } else if (messageType === 'audioMessage') {
                    const aud = message.message.audioMessage;
                    messageBody = aud.ptt ? '[Nota de voz]' : '[Audio]';
                    mediaInfo = {
                        type: 'audio',
                        mimetype: aud.mimetype || 'audio/ogg; codecs=opus',
                        filename: aud.fileName || `audio_${message.key.id}.ogg`,
                        size: aud.fileLength || 0,
                        seconds: aud.seconds || 0,
                        ptt: aud.ptt || false,
                    };
                } else if (messageType === 'documentMessage') {
                    const doc = message.message.documentMessage;
                    messageBody = doc.caption || doc.fileName || '[Documento]';
                    mediaInfo = {
                        type: 'document',
                        mimetype: doc.mimetype || 'application/octet-stream',
                        filename: doc.fileName || `document_${message.key.id}`,
                        size: doc.fileLength || 0,
                    };
                } else if (messageType === 'stickerMessage') {
                    messageBody = '[Sticker]';
                    const stk = message.message.stickerMessage;
                    mediaInfo = {
                        type: 'sticker',
                        mimetype: stk.mimetype || 'image/webp',
                        filename: `sticker_${message.key.id}.webp`,
                        size: stk.fileLength || 0,
                    };
                } else if (messageType === 'locationMessage') {
                    const loc = message.message.locationMessage;
                    messageBody = `📍 Ubicación: ${loc.degreesLatitude}, ${loc.degreesLongitude}`;
                    mediaInfo = {
                        type: 'location',
                        latitude: loc.degreesLatitude,
                        longitude: loc.degreesLongitude,
                    };
                } else if (messageType === 'contactMessage') {
                    // Mensaje de contacto (tarjeta de contacto)
                    const contact = message.message.contactMessage;
                    const displayName = contact.displayName || 'Contacto';
                    const vcard = contact.vcard || '';

                    // Intentar extraer el número de teléfono de la vCard
                    let phone = '';
                    const telMatch = vcard.match(/TEL[^:]*:(.+)/);
                    if (telMatch && telMatch[1]) {
                        phone = telMatch[1].trim();
                    }

                    if (phone) {
                        messageBody = `👤 ${displayName} (${phone})`;
                    } else {
                        messageBody = `👤 ${displayName}`;
                    }

                    mediaInfo = {
                        type: 'contact',
                        name: displayName,
                        phone: phone || null,
                        vcard,
                    };
                } else {
                    // Tipo genérico no soportado aún
                    messageBody = `[Mensaje ${messageType}]`;
                }

                const messageData = {
                    id: message.key.id,
                    from: message.key.remoteJid,
                    body: messageBody,
                    timestamp: message.messageTimestamp,
                    messageType: messageType,
                    mediaInfo: mediaInfo,
                };

                receivedMessages.push(messageData);

                // Descargar archivo multimedia si existe (solo para tipos realmente multimedia)
                const isMediaType = mediaInfo && ['image', 'video', 'audio', 'document', 'sticker'].includes(mediaInfo.type);
                if (isMediaType) {
                    try {
                        const buffer = await downloadMediaMessage(
                            message,
                            'buffer',
                            {},
                            { logger: logger }
                        );

                        // Generar nombre de archivo único
                        const extension = mediaInfo.filename.split('.').pop() || 
                                        (mediaInfo.mimetype.includes('image') ? 'jpg' : 
                                         mediaInfo.mimetype.includes('video') ? 'mp4' : 
                                         mediaInfo.mimetype.includes('audio') ? 'ogg' : 'bin');
                        const safeFilename = `${message.key.id}_${Date.now()}.${extension}`;
                        const mediaPath = path.join(mediaFolder, safeFilename);

                        // Guardar archivo
                        await writeFile(mediaPath, buffer);
                        mediaInfo.path = `/media/${safeFilename}`;
                        console.log(`✅ Archivo multimedia descargado: ${mediaPath}`);
                    } catch (error) {
                        console.error('❌ Error al descargar archivo multimedia:', error);
                        mediaInfo.error = error.message;
                    }
                }

                // Preparar el payload completo del mensaje
                const payload = {
                    id: message.key.id,
                    from: message.key.remoteJid,
                    participant: message.key.participant,
                    body: messageBody,
                    timestamp: message.messageTimestamp,
                    messageType: messageType,
                    isGroup: message.key.remoteJid.includes('@g.us'),
                    mediaInfo: mediaInfo,
                };

                // Guardar el mensaje en la base de datos
                try {
                    await saveReceivedMessage({
                        messageId: message.key.id,
                        fromNumber: message.key.remoteJid,
                        messageBody: messageBody,
                        timestamp: message.messageTimestamp,
                        payload: payload,
                        mediaInfo: mediaInfo,
                    });
                    console.log('Mensaje recibido guardado en la base de datos');

                    // Emitir evento de nuevo mensaje recibido a través de Socket.io
                    if (io) {
                        // Normalizar el número para el frontend (sin @s.whatsapp.net)
                        const numeroNormalizado = message.key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '');
                        
                        io.emit('new_message', {
                            id: message.key.id,
                            numero: numeroNormalizado,
                            numeroCompleto: message.key.remoteJid,
                            body: messageBody,
                            timestamp: message.messageTimestamp * 1000, // Convertir a milisegundos
                            type: 'received',
                            messageType: messageType,
                            mediaInfo: mediaInfo,
                            created_at: new Date().toISOString(),
                        });
                    }
                } catch (error) {
                    console.error('Error al guardar mensaje recibido en la base de datos:', error);
                }

                // Ejemplo de respuesta a un comando específico
                if (messageBody === '!ping') {
                    await sendMessage(message.key.remoteJid, 'pong');
                }
            }
        });

        // Manejar ACK (acknowledgments) de mensajes
        socket.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                if (update.update && update.update.status !== undefined) {
                    const { key, update: { status } } = update;
                    
                    // Log detallado para debugging
                    console.log(`🔍 ACK recibido - MessageId: ${key.id}, Status: ${status}, RemoteJid: ${key.remoteJid}, FromMe: ${key.fromMe}`);
                    
                    // Validar que el status esté en el rango válido (0-4)
                    // Según observación del usuario:
                    // 0 = PENDING (pendiente)
                    // 1 = SERVER_ACK (enviado al servidor)
                    // 2 = DELIVERY_ACK (entregado al dispositivo)
                    // 3 = DELIVERY_ACK (entregado - estado intermedio)
                    // 4 = READ (leído - el verdadero estado de leído)
                    if (status === null || status === undefined || status < 0 || status > 4) {
                        console.log(`⚠️ ACK ignorado (estado fuera de rango): ${key.id} - Estado: ${status}`);
                        continue;
                    }
                    
                    try {
                        const ackResult = await saveMessageAck({
                            messageId: key.id,
                            ackStatus: status,
                            fromNumber: key.remoteJid,
                            timestamp: Math.floor(Date.now() / 1000), // Timestamp en segundos
                        });
                        
                        if (ackResult) {
                            const statusText = ['PENDING', 'SERVER_ACK', 'DELIVERY_ACK', 'DELIVERY_ACK', 'READ'][status];
                            console.log(`📬 ACK guardado: ${key.id} - Estado: ${status} (${statusText})`);
                            
                            // Emitir actualización de estado del mensaje vía Socket.io solo si hay sentMessageId
                            if (io && ackResult.sentMessageId) {
                                io.emit('message_status_update', {
                                    sentMessageId: ackResult.sentMessageId,
                                    messageId: key.id,
                                    deliveryStatus: statusText,
                                    deliveryStatusCode: status,
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error al guardar ACK:', error);
                    }
                }
            }
        });

        console.log('✅ Cliente inicializado, esperando eventos...\n');
    } catch (error) {
        console.error('❌ Error al inicializar el cliente:', error);
        isReady = false;
    }
}

// Funciones para interactuar con el servicio
async function sendMessage(chatId, mensaje) {
    if (!isReady || !socket) {
        throw new Error('El cliente de WhatsApp no está listo. Por favor, espera a que se conecte completamente.');
    }

    // Asegurar que el chatId tenga el formato correcto
    if (!chatId.includes('@')) {
        chatId = `${chatId}@s.whatsapp.net`;
    }

    try {
        const result = await socket.sendMessage(chatId, { text: mensaje });
        return result;
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        throw error;
    }
}

function getReceivedMessages() {
    return receivedMessages;
}

function getLatestQr() {
    return latestQr;
}

function isClientReady() {
    return isReady && socket !== null;
}

function getClientState() {
    return {
        isReady: isReady && socket !== null,
        hasQr: latestQr !== null,
    };
}

// Inicializar el cliente
console.log('🔄 Inicializando cliente de WhatsApp con Baileys...');
console.log('📂 Buscando sesión guardada...\n');

connectToWhatsApp();

// Función para establecer la referencia a Socket.io
function setSocketIO(socketIO) {
    io = socketIO;
}

module.exports = {
    sendMessage,
    getReceivedMessages,
    getLatestQr,
    isClientReady,
    getClientState,
    setSocketIO,
};
