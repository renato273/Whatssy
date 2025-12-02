const whatsappService = require('../services/whatsappService');
const { saveSentMessage, getMessagesByNumber, getMessageAcksBySentMessageId, getMessageAcksByMessageId, markReceivedMessagesAsReadByNumber } = require('../database/connection');

/**
 * @swagger
 * /api/whatsapp/send:
 *   post:
 *     summary: Enviar un mensaje de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *         description: API key configurada en la variable de entorno API_KEY
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numeroDestino
 *               - mensaje
 *               - userId
 *             properties:
 *               numeroDestino:
 *                 type: string
 *                 description: Número de teléfono de destino en formato 1234567890
 *                 example: "1234567890"
 *               mensaje:
 *                 type: string
 *                 description: Contenido del mensaje a enviar
 *                 example: "Hola, este es un mensaje de prueba"
 *               userId:
 *                 type: integer
 *                 description: ID del usuario que envía el mensaje
 *                 example: 1
 *     responses:
 *       200:
 *         description: Mensaje enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mensaje enviado"
 *                 response:
 *                   type: object
 *                   description: Respuesta del cliente de WhatsApp
 *       400:
 *         description: Error de validación - faltan parámetros requeridos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Número de destino y mensaje son requeridos"
 *       401:
 *         description: API key inválida o no proporcionada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "API key inválida o no proporcionada"
 *       500:
 *         description: Error al enviar el mensaje
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al enviar mensaje"
 *       503:
 *         description: El cliente de WhatsApp no está listo o conectado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "El cliente de WhatsApp aún no está conectado. Por favor, escanea el código QR primero."
 *                 state:
 *                   type: object
 *                   properties:
 *                     isReady:
 *                       type: boolean
 *                       example: false
 *                     hasQr:
 *                       type: boolean
 *                       example: true
 */
async function sendMessage(req, res) {
    const { numeroDestino, mensaje, userId } = req.body;

    if (!numeroDestino || !mensaje) {
        return res
            .status(400)
            .json({ error: 'Número de destino y mensaje son requeridos' });
    }

    if (!userId) {
        return res
            .status(400)
            .json({ error: 'El campo userId es requerido' });
    }

    // Verificar que el cliente esté listo antes de intentar enviar
    if (!whatsappService.isClientReady()) {
        const state = whatsappService.getClientState();
        const errorMsg = state.hasQr
            ? 'El cliente de WhatsApp aún no está conectado. Por favor, escanea el código QR primero.'
            : 'El cliente de WhatsApp no está listo. Por favor, espera a que se conecte.';

        // Registrar intento fallido en la base de datos
        try {
            await saveSentMessage({
                userId,
                numeroDestino,
                mensaje,
                status: 'ERROR',
                errorMessage: errorMsg,
            });
        } catch (dbError) {
            console.error('Error al guardar en base de datos:', dbError);
        }

        return res.status(503).json({
            error: errorMsg,
            state: {
                isReady: false,
                hasQr: state.hasQr,
            },
        });
    }

    try {
        // Baileys usa @s.whatsapp.net para números individuales
        // El servicio ya maneja el formato, solo pasamos el número
        const response = await whatsappService.sendMessage(numeroDestino, mensaje);

        // Registrar mensaje exitoso en la base de datos
        // response.key.id contiene el messageId de WhatsApp
        const whatsappMessageId = response?.key?.id || null;
        const savedMessage = await saveSentMessage({
            userId,
            numeroDestino,
            mensaje,
            status: 'PENDING', // Inicialmente PENDING, se actualizará con el ACK
            errorMessage: null,
            whatsappMessageId: whatsappMessageId,
        });

        // Emitir evento de nuevo mensaje enviado a través de Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('new_message', {
                id: savedMessage.id,
                numero: numeroDestino,
                numeroCompleto: numeroDestino.includes('@') ? numeroDestino : `${numeroDestino}@s.whatsapp.net`,
                body: mensaje,
                timestamp: Date.now(),
                type: 'sent',
                status: 'SUCCESS',
                delivery_status: 'PENDING',
                delivery_status_code: 0,
                created_at: new Date().toISOString(),
            });
        }

        res.json({ message: 'Mensaje enviado', response });
    } catch (error) {
        console.error('Error al enviar mensaje:', error);

        // Registrar intento fallido en la base de datos
        try {
            await saveSentMessage({
                userId,
                numeroDestino,
                mensaje,
                status: 'ERROR',
                errorMessage: error.message || String(error),
            });
        } catch (dbError) {
            console.error('Además, falló el guardado en base de datos:', dbError);
        }

        // Determinar el código de estado apropiado
        const statusCode = error.message && error.message.includes('no está listo') ? 503 : 500;

        res.status(statusCode).json({
            error: error.message || 'Error al enviar mensaje',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
}

/**
 * @swagger
 * /api/whatsapp/messages:
 *   get:
 *     summary: Obtener mensajes enviados y recibidos de un número específico
 *     tags: [WhatsApp]
 *     description: |
 *       Retorna una lista de todos los mensajes (enviados y recibidos) de un número específico,
 *       ordenados cronológicamente. El número puede venir con o sin el sufijo @s.whatsapp.net
 *     parameters:
 *       - in: query
 *         name: numero
 *         required: true
 *         schema:
 *           type: string
 *         description: Número de teléfono (con o sin @s.whatsapp.net)
 *         example: "595994709128"
 *     responses:
 *       200:
 *         description: Lista de mensajes ordenados cronológicamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 numero:
 *                   type: string
 *                   description: Número consultado
 *                   example: "595994709128"
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID único del mensaje en la base de datos
 *                       numero:
 *                         type: string
 *                         description: Número de teléfono
 *                       body:
 *                         type: string
 *                         description: Contenido del mensaje
 *                       timestamp:
 *                         type: integer
 *                         description: Timestamp en milisegundos
 *                       created_at:
 *                         type: string
 *                         description: Fecha de creación en formato ISO
 *                       type:
 *                         type: string
 *                         enum: [sent, received]
 *                         description: Tipo de mensaje (enviado o recibido)
 *                       status:
 *                         type: string
 *                         description: Estado del mensaje enviado (SUCCESS o ERROR)
 *                         example: "SUCCESS"
 *                       error_message:
 *                         type: string
 *                         description: Mensaje de error si el envío falló
 *                       payload:
 *                         type: object
 *                         description: Payload completo del mensaje recibido
 *       400:
 *         description: Número no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "El parámetro 'numero' es requerido"
 *       500:
 *         description: Error al consultar los mensajes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al consultar los mensajes"
 */
async function getReceivedMessages(req, res) {
    const { numero } = req.query;

    if (!numero) {
        return res.status(400).json({ error: "El parámetro 'numero' es requerido" });
    }

    try {
        const messages = await getMessagesByNumber(numero);
        
        // Normalizar el número para la respuesta
        const numeroNormalizado = numero.replace('@s.whatsapp.net', '').replace('@c.us', '');

        res.json({
            numero: numeroNormalizado,
            total: messages.length,
            messages: messages,
        });
    } catch (error) {
        console.error('Error al consultar mensajes:', error);
        res.status(500).json({ error: 'Error al consultar los mensajes' });
    }
}

// Marcar mensajes recibidos como leídos para un número
async function markMessagesAsRead(req, res) {
    const { numero } = req.body;

    if (!numero) {
        return res.status(400).json({ error: "El campo 'numero' es requerido" });
    }

    try {
        const result = await markReceivedMessagesAsReadByNumber(numero);
        res.json({
            message: 'Mensajes marcados como leídos',
            changes: result.changes,
        });
    } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
        res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
    }
}

/**
 * @swagger
 * /api/whatsapp/messages/{id}/status:
 *   get:
 *     summary: Obtener estado de entrega de un mensaje enviado
 *     tags: [WhatsApp]
 *     description: Retorna el estado de entrega (ACK) de un mensaje enviado por su ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del mensaje enviado en la base de datos
 *     responses:
 *       200:
 *         description: Estado de entrega del mensaje
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sentMessageId:
 *                   type: integer
 *                 acks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       message_id:
 *                         type: string
 *                       ack_status:
 *                         type: integer
 *                       ack_status_text:
 *                         type: string
 *                       timestamp:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *                 latestStatus:
 *                   type: string
 *       404:
 *         description: Mensaje no encontrado
 */
async function getMessageStatus(req, res) {
    try {
        const { id } = req.params;
        const sentMessageId = parseInt(id);

        if (isNaN(sentMessageId)) {
            return res.status(400).json({
                error: 'ID de mensaje inválido',
            });
        }

        const acks = await getMessageAcksBySentMessageId(sentMessageId);

        if (acks.length === 0) {
            return res.status(404).json({
                error: 'No se encontraron ACK para este mensaje',
            });
        }

        // Obtener el estado más reciente
        const latestAck = acks[0]; // Ya están ordenados por created_at DESC

        res.json({
            sentMessageId: sentMessageId,
            acks: acks,
            latestStatus: latestAck.ack_status_text,
            latestAckStatus: latestAck.ack_status,
        });
    } catch (error) {
        console.error('Error al obtener estado del mensaje:', error);
        res.status(500).json({
            error: error.message || 'Error al obtener estado del mensaje',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
}

/**
 * @swagger
 * /api/whatsapp/qr:
 *   get:
 *     summary: Obtener el último código QR disponible para vincular WhatsApp Web
 *     tags: [WhatsApp]
 *     description: |
 *       Devuelve el último código QR generado por WhatsApp Web si aún está disponible.
 *       Si el cliente ya está listo o no hay un QR reciente, devuelve 404.
 *     responses:
 *       200:
 *         description: QR disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qr:
 *                   type: string
 *                   description: Cadena del código QR para ser renderizada por el cliente
 *       404:
 *         description: No hay un QR disponible actualmente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No hay un QR disponible actualmente"
 */
function getQr(req, res) {
    const qr = whatsappService.getLatestQr();

    if (!qr) {
        return res
            .status(404)
            .json({ error: 'No hay un QR disponible actualmente' });
    }

    res.json({ qr });
}

module.exports = {
    sendMessage,
    getReceivedMessages,
    getQr,
    getMessageStatus,
    markMessagesAsRead,
};

