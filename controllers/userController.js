const { createUser, getUserByEmail, getUserById, updateUser, getUserStatusById } = require('../database/connection');
const crypto = require('crypto');

/**
 * Función para hashear contraseñas
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - correo
 *               - contraseña
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del usuario
 *                 example: "Juan Pérez"
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario (debe ser único)
 *                 example: "juan.perez@example.com"
 *               contraseña:
 *                 type: string
 *                 description: Contraseña del usuario (se hasheará antes de guardar)
 *                 example: "miPassword123"
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo, suspendido]
 *                 description: Estado del usuario
 *                 default: activo
 *                 example: "activo"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario creado exitosamente"
 *                 userId:
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
 *                   example: "Nombre, correo y contraseña son requeridos"
 *       409:
 *         description: El correo ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "El correo ya está registrado"
 *       500:
 *         description: Error al crear el usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al crear el usuario"
 */
async function createUserController(req, res) {
    const { nombre, correo, contraseña, estado = 'activo', current_status_id = null, user_type = 2 } = req.body;

    // Validar campos requeridos
    if (!nombre || !correo || !contraseña) {
        return res.status(400).json({
            error: 'Nombre, correo y contraseña son requeridos',
        });
    }

    // Validar formato de correo básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
        return res.status(400).json({
            error: 'El formato del correo electrónico no es válido',
        });
    }

    // Validar estado
    const estadosValidos = ['activo', 'inactivo', 'suspendido'];
    if (estado && !estadosValidos.includes(estado)) {
        return res.status(400).json({
            error: `El estado debe ser uno de: ${estadosValidos.join(', ')}`,
        });
    }

    // Validar tipo de usuario
    const tiposValidos = [1, 2];
    if (user_type && !tiposValidos.includes(user_type)) {
        return res.status(400).json({
            error: 'user_type debe ser 1 (admin) o 2 (user)',
        });
    }

    // Validar longitud de contraseña
    if (contraseña.length < 6) {
        return res.status(400).json({
            error: 'La contraseña debe tener al menos 6 caracteres',
        });
    }

    try {
        // Verificar si el correo ya existe
        const existingUser = await getUserByEmail(correo);
        if (existingUser) {
            return res.status(409).json({
                error: 'El correo ya está registrado',
            });
        }

        // Hashear la contraseña antes de guardar
        const hashedPassword = hashPassword(contraseña);

        // Crear el usuario
        const result = await createUser({
            nombre,
            correo,
            contraseña: hashedPassword,
            estado,
            currentStatusId: current_status_id,
            userType: user_type || 2,
            createdBy: null, // Puedes obtenerlo del token de autenticación si lo implementas
        });

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            userId: result.id,
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({
            error: 'Error al crear el usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - contraseña
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario
 *                 example: "juan.perez@example.com"
 *               contraseña:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: "miPassword123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login exitoso"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: "Juan Pérez"
 *                     correo:
 *                       type: string
 *                       example: "juan.perez@example.com"
 *                     estado:
 *                       type: string
 *                       example: "activo"
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Correo o contraseña incorrectos"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Correo y contraseña son requeridos"
 */
async function loginController(req, res) {
    const { correo, contraseña } = req.body;

    // Validar campos requeridos
    if (!correo || !contraseña) {
        return res.status(400).json({
            error: 'Correo y contraseña son requeridos',
        });
    }

    try {
        // Buscar usuario por correo
        const user = await getUserByEmail(correo);
        
        if (!user) {
            return res.status(401).json({
                error: 'Correo o contraseña incorrectos',
            });
        }

        // Verificar si el usuario está activo
        if (user.estado !== 'activo') {
            return res.status(401).json({
                error: 'Usuario inactivo o suspendido',
            });
        }

        // Verificar contraseña
        const hashedPassword = hashPassword(contraseña);
        if (user.contraseña !== hashedPassword) {
            return res.status(401).json({
                error: 'Correo o contraseña incorrectos',
            });
        }

        // Retornar información del usuario (sin contraseña) y API key
        const { contraseña: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login exitoso',
            user: userWithoutPassword,
            apiKey: process.env.API_KEY, // Incluir API key en la respuesta
        });
    } catch (error) {
        console.error('Error al hacer login:', error);
        res.status(500).json({
            error: 'Error al procesar el login',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

// Actualizar estado de presencia del usuario (online, offline, etc.)
async function updateUserStatusController(req, res) {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
        return res.status(400).json({
            error: 'ID de usuario debe ser un número válido',
        });
    }

    const { status_id } = req.body;

    if (!status_id) {
        return res.status(400).json({
            error: 'status_id es requerido',
        });
    }

    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const status = await getUserStatusById(status_id);
        if (!status || status.activo === 0) {
            return res.status(400).json({ error: 'Estado de usuario inválido o inactivo' });
        }

        const result = await updateUser(userId, {
            currentStatusId: status_id,
            updatedBy: userId,
        });

        if (result.changes === 0) {
            return res.status(400).json({ error: 'No se pudo actualizar el estado del usuario' });
        }

        const updatedUser = await getUserById(userId);

        res.json({
            message: 'Estado de usuario actualizado exitosamente',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error al actualizar estado de usuario:', error);
        res.status(500).json({
            error: 'Error al actualizar el estado del usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    createUser: createUserController,
    login: loginController,
    updateUserStatus: updateUserStatusController,
};

