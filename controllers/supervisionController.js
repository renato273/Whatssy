const { getUserSupervisionSummary, getUnreadContactsByUser } = require('../database/connection');

async function getSupervisionSummary(req, res) {
    try {
        const summary = await getUserSupervisionSummary();
        res.json({ users: summary });
    } catch (error) {
        console.error('Error al obtener resumen de supervisión:', error);
        res.status(500).json({
            error: 'Error al obtener resumen de supervisión',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function getUnreadContacts(req, res) {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    try {
        const contactos = await getUnreadContactsByUser(userId);
        res.json({ contactos });
    } catch (error) {
        console.error('Error al obtener contactos con mensajes sin leer:', error);
        res.status(500).json({
            error: 'Error al obtener contactos con mensajes sin leer',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    getSupervisionSummary,
    getUnreadContacts,
};


