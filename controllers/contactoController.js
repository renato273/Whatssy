const { createContacto, getContactoByNumero, getContactoById, updateContacto, getAllContactos, deleteContacto } = require('../database/connection');

/**
 * @swagger
 * /api/contactos:
 *   post:
 *     summary: Crear un nuevo contacto
 *     tags: [Contactos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre_contacto
 *               - numero
 *             properties:
 *               nombre_contacto:
 *                 type: string
 *                 description: Nombre del contacto
 *                 example: "Juan Pérez"
 *               numero:
 *                 type: string
 *                 description: Número de teléfono del contacto (con o sin @s.whatsapp.net)
 *                 example: "595994709128"
 *               observacion:
 *                 type: string
 *                 description: Observaciones o notas sobre el contacto
 *                 example: "Cliente importante"
 *               created_by:
 *                 type: integer
 *                 description: ID del usuario que crea el contacto
 *                 example: 1
 *     responses:
 *       201:
 *         description: Contacto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Contacto creado exitosamente"
 *                 contactoId:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Nombre y número son requeridos"
 *       409:
 *         description: El número ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ya existe un contacto con este número"
 *       500:
 *         description: Error al crear el contacto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al crear el contacto"
 */
async function createContactoController(req, res) {
    const { nombre_contacto, numero, observacion, created_by, user_id } = req.body;

    // Validar campos requeridos
    if (!nombre_contacto || !numero) {
        return res.status(400).json({
            error: 'Nombre y número son requeridos',
        });
    }

    // Normalizar el número (quitar espacios y caracteres especiales excepto @)
    const numeroNormalizado = numero.trim().replace(/\s+/g, '');

    // Validar que el número tenga un formato básico válido
    if (numeroNormalizado.length < 8) {
        return res.status(400).json({
            error: 'El número de teléfono debe tener al menos 8 dígitos',
        });
    }

    try {
        // Verificar si el número ya existe
        const existingContacto = await getContactoByNumero(numeroNormalizado);
        if (existingContacto) {
            return res.status(409).json({
                error: 'Ya existe un contacto con este número',
            });
        }

        // Crear el contacto
        const result = await createContacto({
            nombreContacto: nombre_contacto,
            numero: numeroNormalizado,
            observacion: observacion || null,
            createdBy: created_by || null,
            userId: user_id || created_by || null,
        });

        res.status(201).json({
            message: 'Contacto creado exitosamente',
            contactoId: result.id,
        });
    } catch (error) {
        console.error('Error al crear contacto:', error);
        res.status(500).json({
            error: 'Error al crear el contacto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * @swagger
 * /api/contactos/{id}:
 *   put:
 *     summary: Actualizar un contacto existente
 *     tags: [Contactos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del contacto a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_contacto:
 *                 type: string
 *                 description: Nombre del contacto
 *                 example: "Juan Pérez"
 *               numero:
 *                 type: string
 *                 description: Número de teléfono del contacto (con o sin @s.whatsapp.net)
 *                 example: "595994709128"
 *               observacion:
 *                 type: string
 *                 description: Observaciones o notas sobre el contacto
 *                 example: "Cliente importante - Actualizado"
 *               updated_by:
 *                 type: integer
 *                 description: ID del usuario que actualiza el contacto
 *                 example: 1
 *     responses:
 *       200:
 *         description: Contacto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Contacto actualizado exitosamente"
 *                 changes:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "ID del contacto es requerido"
 *       404:
 *         description: Contacto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Contacto no encontrado"
 *       409:
 *         description: El número ya está registrado en otro contacto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Ya existe otro contacto con este número"
 *       500:
 *         description: Error al actualizar el contacto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al actualizar el contacto"
 */
async function updateContactoController(req, res) {
    const { id } = req.params;
    const { nombre_contacto, numero, observacion, updated_by } = req.body;

    // Validar que el ID sea un número
    const contactoId = parseInt(id);
    if (isNaN(contactoId)) {
        return res.status(400).json({
            error: 'ID del contacto debe ser un número válido',
        });
    }

    // Validar que al menos un campo se esté actualizando
    if (!nombre_contacto && !numero && observacion === undefined) {
        return res.status(400).json({
            error: 'Debe proporcionar al menos un campo para actualizar',
        });
    }

    // Normalizar el número si se proporciona
    let numeroNormalizado = null;
    if (numero) {
        numeroNormalizado = numero.trim().replace(/\s+/g, '');
        
        // Validar que el número tenga un formato básico válido
        if (numeroNormalizado.length < 8) {
            return res.status(400).json({
                error: 'El número de teléfono debe tener al menos 8 dígitos',
            });
        }
    }

    try {
        // Verificar que el contacto exista
        const existingContacto = await getContactoById(contactoId);
        if (!existingContacto) {
            return res.status(404).json({
                error: 'Contacto no encontrado',
            });
        }

        // Si se está actualizando el número, verificar que no esté duplicado
        if (numeroNormalizado) {
            const contactoConMismoNumero = await getContactoByNumero(numeroNormalizado);
            if (contactoConMismoNumero && contactoConMismoNumero.id !== contactoId) {
                return res.status(409).json({
                    error: 'Ya existe otro contacto con este número',
                });
            }
        }

        // Preparar los datos para actualizar
        const updateData = {};
        if (nombre_contacto !== undefined) {
            updateData.nombreContacto = nombre_contacto;
        }
        if (numeroNormalizado !== null) {
            updateData.numero = numeroNormalizado;
        }
        if (observacion !== undefined) {
            updateData.observacion = observacion;
        }
        if (updated_by !== undefined) {
            updateData.updatedBy = updated_by;
        }

        // Actualizar el contacto
        const result = await updateContacto(contactoId, updateData);

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'No se pudo actualizar el contacto. Verifica que el ID sea correcto.',
            });
        }

        res.json({
            message: 'Contacto actualizado exitosamente',
            changes: result.changes,
        });
    } catch (error) {
        console.error('Error al actualizar contacto:', error);
        res.status(500).json({
            error: 'Error al actualizar el contacto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * @swagger
 * /api/contactos:
 *   get:
 *     summary: Obtener todos los contactos
 *     tags: [Contactos]
 *     responses:
 *       200:
 *         description: Lista de contactos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contactos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nombre_contacto:
 *                         type: string
 *                       numero:
 *                         type: string
 *                       observacion:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *       500:
 *         description: Error al obtener contactos
 */
async function getAllContactosController(req, res) {
    // Permite filtrar por usuario: /api/contactos?userId=1
    try {
        const { userId } = req.query;
        const parsedUserId = userId ? parseInt(userId, 10) : null;

        const contactos = await getAllContactos(parsedUserId);
        res.json({ contactos });
    } catch (error) {
        console.error('Error al obtener contactos:', error);
        res.status(500).json({
            error: 'Error al obtener los contactos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * Obtener un contacto por ID
 */
async function getContactoByIdController(req, res) {
    const { id } = req.params;
    const contactoId = parseInt(id, 10);

    if (isNaN(contactoId)) {
        return res.status(400).json({ error: 'ID del contacto debe ser un número válido' });
    }

    try {
        const contacto = await getContactoById(contactoId);
        if (!contacto) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }
        res.json({ contacto });
    } catch (error) {
        console.error('Error al obtener contacto por ID:', error);
        res.status(500).json({
            error: 'Error al obtener el contacto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * Eliminar un contacto
 */
async function deleteContactoController(req, res) {
    const { id } = req.params;
    const contactoId = parseInt(id, 10);

    if (isNaN(contactoId)) {
        return res.status(400).json({ error: 'ID del contacto debe ser un número válido' });
    }

    try {
        // Verificar que exista
        const existingContacto = await getContactoById(contactoId);
        if (!existingContacto) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }

        const result = await deleteContacto(contactoId);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'No se pudo eliminar el contacto' });
        }

        res.json({ message: 'Contacto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar contacto:', error);
        res.status(500).json({
            error: 'Error al eliminar el contacto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    createContacto: createContactoController,
    updateContacto: updateContactoController,
    getAllContactos: getAllContactosController,
    getContactoById: getContactoByIdController,
    deleteContacto: deleteContactoController,
};

