// routes/etiquetas.js
const express = require('express');
const router = express.Router();
const etiquetaController = require('../controllers/etiquetaController');

// CRUD de etiquetas
router.get('/', etiquetaController.getAllEtiquetas);
router.post('/', etiquetaController.createEtiqueta);
router.put('/:id', etiquetaController.updateEtiqueta);
router.delete('/:id', etiquetaController.deleteEtiqueta);

// Etiquetas por contacto
router.get('/contacto/:id', etiquetaController.getEtiquetasByContacto);
router.post('/contacto/:id', etiquetaController.setEtiquetasForContacto);

module.exports = router;


