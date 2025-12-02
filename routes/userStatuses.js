// routes/userStatuses.js
const express = require('express');
const router = express.Router();
const userStatusController = require('../controllers/userStatusController');

// CRUD de estados de usuario
router.get('/', userStatusController.getAllStatuses);
router.get('/:id', userStatusController.getStatusById);
router.post('/', userStatusController.createStatus);
router.put('/:id', userStatusController.updateStatus);
router.delete('/:id', userStatusController.deleteStatus);

module.exports = router;


