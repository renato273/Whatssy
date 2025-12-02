// routes/supervision.js
const express = require('express');
const router = express.Router();
const supervisionController = require('../controllers/supervisionController');

// Resumen de supervisión de usuarios
router.get('/users', supervisionController.getSupervisionSummary);
router.get('/users/:id/unread-contacts', supervisionController.getUnreadContacts);

module.exports = router;


