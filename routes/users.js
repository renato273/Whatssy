// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Rutas
router.post('/', userController.createUser);
router.post('/login', userController.login);
router.get('/', userController.getAllUsers);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.put('/:id/status', userController.updateUserStatus);

module.exports = router;

