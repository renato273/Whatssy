// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const validateApiKey = require('../middleware/validateApiKey');
const whatsappController = require('../controllers/whatsappController');

// Rutas
router.post('/send', validateApiKey, whatsappController.sendMessage);
router.get('/messages', whatsappController.getReceivedMessages);
router.post('/messages/read', whatsappController.markMessagesAsRead);
router.get('/qr', whatsappController.getQr);
router.get('/messages/:id/status', whatsappController.getMessageStatus);

module.exports = router;
