// routes/contactos.js
const express = require('express');
const router = express.Router();
const contactoController = require('../controllers/contactoController');

// Rutas
router.get('/', contactoController.getAllContactos);
router.get('/:id', contactoController.getContactoById);
router.post('/', contactoController.createContacto);
router.put('/:id', contactoController.updateContacto);
router.delete('/:id', contactoController.deleteContacto);

module.exports = router;

