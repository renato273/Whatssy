const { 
    createUserStatus, 
    getUserStatusById, 
    getAllUserStatuses, 
    updateUserStatus, 
    deleteUserStatus 
} = require('../database/connection');

// Crear nuevo estado de usuario
async function createStatus(req, res) {
    const { nombre, codigo, descripcion, color, activo = 1, created_by } = req.body;

    if (!nombre || !codigo) {
        return res.status(400).json({ error: 'Nombre y código son requeridos' });
    }

    try {
        const result = await createUserStatus({
            nombre,
            codigo,
            descripcion: descripcion || null,
            color: color || null,
            activo: activo ? 1 : 0,
            createdBy: created_by || null,
        });

        res.status(201).json({
            message: 'Estado de usuario creado exitosamente',
            statusId: result.id,
        });
    } catch (error) {
        console.error('Error al crear estado de usuario:', error);
        res.status(500).json({
            error: 'Error al crear el estado de usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

// Obtener todos los estados
async function getAllStatuses(req, res) {
    try {
        const statuses = await getAllUserStatuses();
        res.json({ statuses });
    } catch (error) {
        console.error('Error al obtener estados de usuario:', error);
        res.status(500).json({
            error: 'Error al obtener los estados de usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

// Obtener un estado por ID
async function getStatusById(req, res) {
    const { id } = req.params;
    const statusId = parseInt(id, 10);

    if (isNaN(statusId)) {
        return res.status(400).json({ error: 'ID del estado debe ser un número válido' });
    }

    try {
        const status = await getUserStatusById(statusId);
        if (!status) {
            return res.status(404).json({ error: 'Estado de usuario no encontrado' });
        }
        res.json({ status });
    } catch (error) {
        console.error('Error al obtener estado de usuario:', error);
        res.status(500).json({
            error: 'Error al obtener el estado de usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

// Actualizar estado
async function updateStatus(req, res) {
    const { id } = req.params;
    const statusId = parseInt(id, 10);

    if (isNaN(statusId)) {
        return res.status(400).json({ error: 'ID del estado debe ser un número válido' });
    }

    const { nombre, codigo, descripcion, color, activo, updated_by } = req.body;

    try {
        const existing = await getUserStatusById(statusId);
        if (!existing) {
            return res.status(404).json({ error: 'Estado de usuario no encontrado' });
        }

        const result = await updateUserStatus(statusId, {
            nombre,
            codigo,
            descripcion,
            color,
            activo,
            updatedBy: updated_by || null,
        });

        if (result.changes === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar el estado de usuario' });
        }

        res.json({
            message: 'Estado de usuario actualizado exitosamente',
            changes: result.changes,
        });
    } catch (error) {
        console.error('Error al actualizar estado de usuario:', error);
        res.status(500).json({
            error: 'Error al actualizar el estado de usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

// Eliminar estado
async function deleteStatus(req, res) {
    const { id } = req.params;
    const statusId = parseInt(id, 10);

    if (isNaN(statusId)) {
        return res.status(400).json({ error: 'ID del estado debe ser un número válido' });
    }

    try {
        const existing = await getUserStatusById(statusId);
        if (!existing) {
            return res.status(404).json({ error: 'Estado de usuario no encontrado' });
        }

        const result = await deleteUserStatus(statusId);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'No se pudo eliminar el estado de usuario' });
        }

        res.json({ message: 'Estado de usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar estado de usuario:', error);
        res.status(500).json({
            error: 'Error al eliminar el estado de usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    createStatus,
    getAllStatuses,
    getStatusById,
    updateStatus,
    deleteStatus,
};


