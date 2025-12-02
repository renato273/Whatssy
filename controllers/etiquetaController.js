const {
    createEtiqueta,
    getEtiquetaById,
    getAllEtiquetas,
    updateEtiqueta,
    deleteEtiqueta,
    getEtiquetasByContacto,
    setEtiquetasForContacto,
} = require('../database/connection');

// CRUD de etiquetas
async function createEtiquetaController(req, res) {
    const { nombre, color, descripcion, activo = 1, created_by } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la etiqueta es requerido' });
    }

    try {
        const result = await createEtiqueta({
            nombre,
            color: color || null,
            descripcion: descripcion || null,
            activo: activo ? 1 : 0,
            createdBy: created_by || null,
        });

        res.status(201).json({
            message: 'Etiqueta creada exitosamente',
            etiquetaId: result.id,
        });
    } catch (error) {
        console.error('Error al crear etiqueta:', error);
        res.status(500).json({
            error: 'Error al crear la etiqueta',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function getAllEtiquetasController(req, res) {
    try {
        const etiquetas = await getAllEtiquetas();
        res.json({ etiquetas });
    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({
            error: 'Error al obtener las etiquetas',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function updateEtiquetaController(req, res) {
    const { id } = req.params;
    const etiquetaId = parseInt(id, 10);

    if (isNaN(etiquetaId)) {
        return res.status(400).json({ error: 'ID de la etiqueta debe ser un número válido' });
    }

    const { nombre, color, descripcion, activo, updated_by } = req.body;

    try {
        const existing = await getEtiquetaById(etiquetaId);
        if (!existing) {
            return res.status(404).json({ error: 'Etiqueta no encontrada' });
        }

        const result = await updateEtiqueta(etiquetaId, {
            nombre,
            color,
            descripcion,
            activo,
            updatedBy: updated_by || null,
        });

        if (result.changes === 0) {
            return res.status(400).json({ error: 'No se pudo actualizar la etiqueta' });
        }

        res.json({
            message: 'Etiqueta actualizada exitosamente',
            changes: result.changes,
        });
    } catch (error) {
        console.error('Error al actualizar etiqueta:', error);
        res.status(500).json({
            error: 'Error al actualizar la etiqueta',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function deleteEtiquetaController(req, res) {
    const { id } = req.params;
    const etiquetaId = parseInt(id, 10);

    if (isNaN(etiquetaId)) {
        return res.status(400).json({ error: 'ID de la etiqueta debe ser un número válido' });
    }

    try {
        const existing = await getEtiquetaById(etiquetaId);
        if (!existing) {
            return res.status(404).json({ error: 'Etiqueta no encontrada' });
        }

        const result = await deleteEtiqueta(etiquetaId);
        if (result.changes === 0) {
            return res.status(400).json({ error: 'No se pudo eliminar la etiqueta' });
        }

        res.json({ message: 'Etiqueta eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar etiqueta:', error);
        res.status(500).json({
            error: 'Error al eliminar la etiqueta',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

// Etiquetas por contacto
async function getEtiquetasByContactoController(req, res) {
    const { id } = req.params;
    const contactoId = parseInt(id, 10);

    if (isNaN(contactoId)) {
        return res.status(400).json({ error: 'ID del contacto debe ser un número válido' });
    }

    try {
        const etiquetas = await getEtiquetasByContacto(contactoId);
        res.json({ etiquetas });
    } catch (error) {
        console.error('Error al obtener etiquetas del contacto:', error);
        res.status(500).json({
            error: 'Error al obtener etiquetas del contacto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function setEtiquetasForContactoController(req, res) {
    const { id } = req.params;
    const contactoId = parseInt(id, 10);

    if (isNaN(contactoId)) {
        return res.status(400).json({ error: 'ID del contacto debe ser un número válido' });
    }

    const { etiquetas } = req.body; // array de IDs

    if (!Array.isArray(etiquetas)) {
        return res.status(400).json({ error: 'etiquetas debe ser un arreglo de IDs' });
    }

    try {
        const result = await setEtiquetasForContacto(contactoId, etiquetas);
        res.json({
            message: 'Etiquetas actualizadas correctamente',
            changes: result.changes,
        });
    } catch (error) {
        console.error('Error al actualizar etiquetas del contacto:', error);
        res.status(500).json({
            error: 'Error al actualizar etiquetas del contacto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    createEtiqueta: createEtiquetaController,
    getAllEtiquetas: getAllEtiquetasController,
    updateEtiqueta: updateEtiquetaController,
    deleteEtiqueta: deleteEtiquetaController,
    getEtiquetasByContacto: getEtiquetasByContactoController,
    setEtiquetasForContacto: setEtiquetasForContactoController,
};


