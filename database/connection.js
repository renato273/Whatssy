const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'messages.db');

let db;

function initDb() {
    db = new sqlite3.Database(DB_PATH, err => {
        if (err) {
            console.error('Error al conectar con SQLite:', err);
            return;
        }

        console.log('Conectado a la base de datos SQLite.');

        // Crear tabla de usuarios
        db.run(
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                correo TEXT NOT NULL UNIQUE,
                contraseña TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'activo', -- activo, inactivo, suspendido
                current_status_id INTEGER, -- referencia a tabla de estados de usuario
                user_type INTEGER NOT NULL DEFAULT 2, -- 1=admin, 2=user
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (updated_by) REFERENCES users(id)
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla users:', createErr);
                } else {
                    console.log('Tabla users lista para usar.');

                    // Agregar columna current_status_id si no existe (para bases ya creadas)
                    db.run(
                        `ALTER TABLE users ADD COLUMN current_status_id INTEGER`,
                        alterErr => {
                            if (alterErr && !alterErr.message.includes('duplicate column')) {
                                console.log('Columna current_status_id ya existe o no se pudo agregar.');
                            }
                        }
                    );

                    // Agregar columna user_type si no existe (para bases ya creadas)
                    db.run(
                        `ALTER TABLE users ADD COLUMN user_type INTEGER NOT NULL DEFAULT 2`,
                        alterErr => {
                            if (alterErr && !alterErr.message.includes('duplicate column')) {
                                console.log('Columna user_type ya existe o no se pudo agregar.');
                            }
                        }
                    );
                }
            }
        );

        // Crear tabla de estados de usuario (presencia)
        db.run(
            `CREATE TABLE IF NOT EXISTS user_statuses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                codigo TEXT NOT NULL UNIQUE,
                descripcion TEXT,
                color TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (updated_by) REFERENCES users(id)
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla user_statuses:', createErr);
                } else {
                    console.log('Tabla user_statuses lista para usar.');

                    // Insertar estados por defecto si la tabla está vacía
                    db.get('SELECT COUNT(*) as count FROM user_statuses', (countErr, row) => {
                        if (countErr) {
                            console.error('Error al contar user_statuses:', countErr);
                            return;
                        }

                        if (row && row.count === 0) {
                            const insertSql = `INSERT INTO user_statuses (nombre, codigo, descripcion, color) VALUES 
                                ('En línea', 'online', 'Disponible / En línea', '#16a34a'),
                                ('Fuera de línea', 'offline', 'Desconectado', '#6b7280'),
                                ('Gestión administrativa', 'admin', 'Realizando tareas administrativas', '#2563eb'),
                                ('Almuerzo', 'lunch', 'En pausa por almuerzo', '#f59e0b')`;
                            db.run(insertSql, err2 => {
                                if (err2) {
                                    console.error('Error al insertar estados de usuario por defecto:', err2);
                                } else {
                                    console.log('Estados de usuario por defecto insertados.');
                                }
                            });
                        }
                    });
                }
            }
        );

        // Crear tabla de mensajes enviados
        db.run(
            `CREATE TABLE IF NOT EXISTS sent_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                numero_destino TEXT NOT NULL,
                mensaje TEXT NOT NULL,
                status TEXT NOT NULL, -- SUCCESS o ERROR
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla sent_messages:', createErr);
                } else {
                    console.log('Tabla sent_messages lista para usar.');
                    // Agregar columna user_id si no existe (para tablas existentes)
                    db.run(
                        `ALTER TABLE sent_messages ADD COLUMN user_id INTEGER REFERENCES users(id)`,
                        alterErr => {
                            // Ignorar error si la columna ya existe
                            if (alterErr && !alterErr.message.includes('duplicate column')) {
                                console.log('Columna user_id ya existe o no se pudo agregar.');
                            }
                        }
                    );
                }
            }
        );

        db.run(
            `CREATE TABLE IF NOT EXISTS received_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT NOT NULL,
                from_number TEXT NOT NULL,
                message_body TEXT,
                timestamp INTEGER,
                payload TEXT NOT NULL, -- JSON completo del mensaje
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla received_messages:', createErr);
                } else {
                    console.log('Tabla received_messages lista para usar.');

                    // Agregar columna is_read si no existe (para bases ya creadas)
                    db.run(
                        `ALTER TABLE received_messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`,
                        alterErr => {
                            if (alterErr && !alterErr.message.includes('duplicate column')) {
                                console.log('Columna is_read en received_messages ya existe o no se pudo agregar.');
                            }
                        }
                    );
                }
            }
        );

        // Crear tabla de ACK (acknowledgments) de mensajes
        db.run(
            `CREATE TABLE IF NOT EXISTS message_acks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT NOT NULL, -- ID del mensaje de WhatsApp
                sent_message_id INTEGER, -- ID del mensaje enviado en sent_messages (si existe)
                ack_status INTEGER NOT NULL, -- 0=PENDING, 1=SERVER_ACK, 2=DELIVERY_ACK, 3=READ
                ack_status_text TEXT, -- PENDING, SERVER_ACK, DELIVERY_ACK, READ
                from_number TEXT, -- Número que envió el ACK
                timestamp INTEGER, -- Timestamp del ACK
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sent_message_id) REFERENCES sent_messages(id)
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla message_acks:', createErr);
                } else {
                    console.log('Tabla message_acks lista para usar.');
                }
            }
        );

        // Crear tabla de contactos
        db.run(
            `CREATE TABLE IF NOT EXISTS contactos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_contacto TEXT NOT NULL,
                numero TEXT NOT NULL,
                observacion TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,
                user_id INTEGER,
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (updated_by) REFERENCES users(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla contactos:', createErr);
                } else {
                    console.log('Tabla contactos lista para usar.');

                    // Agregar columna user_id si no existe (para bases ya creadas)
                    db.run(
                        `ALTER TABLE contactos ADD COLUMN user_id INTEGER REFERENCES users(id)`,
                        alterErr => {
                            if (alterErr && !alterErr.message.includes('duplicate column')) {
                                console.log('Columna user_id en contactos ya existe o no se pudo agregar.');
                            }
                        }
                    );
                }
            }
        );

        // Crear tabla de etiquetas
        db.run(
            `CREATE TABLE IF NOT EXISTS etiquetas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                color TEXT,
                descripcion TEXT,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (updated_by) REFERENCES users(id)
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla etiquetas:', createErr);
                } else {
                    console.log('Tabla etiquetas lista para usar.');
                }
            }
        );

        // Tabla de relación contacto-etiquetas (muchos a muchos)
        db.run(
            `CREATE TABLE IF NOT EXISTS contacto_etiquetas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contacto_id INTEGER NOT NULL,
                etiqueta_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(contacto_id, etiqueta_id),
                FOREIGN KEY (contacto_id) REFERENCES contactos(id) ON DELETE CASCADE,
                FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
            )`,
            createErr => {
                if (createErr) {
                    console.error('Error al crear la tabla contacto_etiquetas:', createErr);
                } else {
                    console.log('Tabla contacto_etiquetas lista para usar.');
                }
            }
        );
    });
}

function saveSentMessage({ userId, numeroDestino, mensaje, status, errorMessage = null, whatsappMessageId = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `INSERT INTO sent_messages
            (user_id, numero_destino, mensaje, status, error_message)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(sql, [userId || null, numeroDestino, mensaje, status, errorMessage], function (err) {
            if (err) {
                console.error('Error al guardar mensaje enviado en la base de datos:', err);
                return reject(err);
            }

            const sentMessageId = this.lastID;

            // Si tenemos el whatsappMessageId, actualizar el ACK para hacer match
            if (whatsappMessageId) {
                updateAckWithSentMessageId(whatsappMessageId, sentMessageId, numeroDestino);
            }

            resolve({ id: sentMessageId, whatsappMessageId: whatsappMessageId });
        });
    });
}

function updateAckWithSentMessageId(whatsappMessageId, sentMessageId, numeroDestino) {
    if (!db) return;

    // Actualizar el ACK con el sent_message_id si existe
    const sql = `UPDATE message_acks SET sent_message_id = ? WHERE message_id = ?`;
    db.run(sql, [sentMessageId, whatsappMessageId], (err) => {
        if (err) {
            console.error('Error al actualizar ACK con sent_message_id:', err);
        } else {
            // Actualizar el estado de entrega del mensaje enviado
            db.get(`SELECT ack_status_text FROM message_acks WHERE message_id = ? ORDER BY created_at DESC LIMIT 1`, 
                [whatsappMessageId], (err, ack) => {
                    if (!err && ack && ack.ack_status_text) {
                        updateSentMessageDeliveryStatus(sentMessageId, ack.ack_status_text);
                    }
                });
        }
    });
}

function saveReceivedMessage({ messageId, fromNumber, messageBody, timestamp, payload, mediaInfo = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        // Incluir mediaInfo en el payload si existe
        const fullPayload = {
            ...payload,
            mediaInfo: mediaInfo,
        };

        const sql = `INSERT INTO received_messages
            (message_id, from_number, message_body, timestamp, payload, is_read)
            VALUES (?, ?, ?, ?, ?, 0)`;

        // Convertir el payload a JSON string si es un objeto
        const payloadString = typeof fullPayload === 'string' ? fullPayload : JSON.stringify(fullPayload);

        db.run(
            sql,
            [messageId, fromNumber, messageBody || null, timestamp || null, payloadString],
            function (err) {
                if (err) {
                    console.error('Error al guardar mensaje recibido en la base de datos:', err);
                    return reject(err);
                }

                resolve({ id: this.lastID });
            }
        );
    });
}

function getMessagesByNumber(numero) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        // Normalizar el número: quitar @s.whatsapp.net si existe
        const numeroNormalizado = numero.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const numeroConSufijo = `${numeroNormalizado}@s.whatsapp.net`;

        // Consultar mensajes enviados (donde numero_destino es el número sin sufijo)
        // Incluir el último ACK para cada mensaje
        const sentQuery = `SELECT 
            sm.id,
            sm.user_id,
            sm.numero_destino as numero,
            sm.mensaje as body,
            sm.status,
            sm.error_message,
            sm.created_at as timestamp,
            u.nombre as user_nombre,
            u.correo as user_correo,
            (SELECT ack_status_text FROM message_acks 
             WHERE sent_message_id = sm.id 
             ORDER BY created_at DESC LIMIT 1) as delivery_status,
            (SELECT ack_status FROM message_acks 
             WHERE sent_message_id = sm.id 
             ORDER BY created_at DESC LIMIT 1) as delivery_status_code,
            'sent' as type
        FROM sent_messages sm
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE sm.numero_destino = ? OR sm.numero_destino = ?
        ORDER BY sm.created_at ASC`;

        // Consultar mensajes recibidos (donde from_number puede tener @s.whatsapp.net)
        const receivedQuery = `SELECT 
            id,
            from_number as numero,
            message_body as body,
            timestamp,
            payload,
            created_at,
            is_read,
            'received' as type
        FROM received_messages 
        WHERE from_number = ? OR from_number = ? OR from_number LIKE ?
        ORDER BY timestamp ASC`;

        const sentParams = [numeroNormalizado, numeroConSufijo];
        const receivedParams = [numeroNormalizado, numeroConSufijo, `${numeroNormalizado}@%`];

        // Ejecutar ambas consultas
        db.all(sentQuery, sentParams, (err, sentMessages) => {
            if (err) {
                console.error('Error al consultar mensajes enviados:', err);
                return reject(err);
            }

            db.all(receivedQuery, receivedParams, (err, receivedMessages) => {
                if (err) {
                    console.error('Error al consultar mensajes recibidos:', err);
                    return reject(err);
                }

                // Combinar y normalizar los resultados
                const allMessages = [];

                // Agregar mensajes enviados
                if (sentMessages) {
                    sentMessages.forEach(msg => {
                        // SQLite guarda created_at en hora local del servidor (ej: "2025-11-28 16:37:21")
                        // JavaScript interpreta esto como hora local, lo que agrega 3 horas al convertir a UTC
                        // WhatsApp envía timestamps en UTC puro (sin offset)
                        // Solución: tratar la fecha de SQLite como si fuera UTC
                        let timestamp;
                        const dateStr = msg.timestamp;
                        
                        if (dateStr) {
                            // SQLite guarda como "YYYY-MM-DD HH:MM:SS" (hora local)
                            // Para tratarlo como UTC, necesitamos convertir a formato ISO con 'Z'
                            // Reemplazar el espacio con 'T' y agregar 'Z' al final
                            const utcDateStr = dateStr.replace(' ', 'T') + 'Z';
                            timestamp = new Date(utcDateStr).getTime();
                        } else {
                            timestamp = Date.now();
                        }
                        
                        allMessages.push({
                            id: msg.id,
                            user_id: msg.user_id,
                            user_nombre: msg.user_nombre,
                            user_correo: msg.user_correo,
                            numero: msg.numero,
                            body: msg.body,
                            timestamp: timestamp,
                            created_at: msg.timestamp,
                            type: 'sent',
                            status: msg.status,
                            error_message: msg.error_message,
                            delivery_status: msg.delivery_status || 'PENDING',
                            delivery_status_code: msg.delivery_status_code !== null ? msg.delivery_status_code : 0,
                        });
                    });
                }

                // Agregar mensajes recibidos
                if (receivedMessages) {
                    receivedMessages.forEach(msg => {
                        // Convertir timestamp (en segundos) a milisegundos, o usar created_at como fallback
                        let timestamp;
                        if (msg.timestamp) {
                            timestamp = msg.timestamp * 1000; // Convertir de segundos a milisegundos
                        } else if (msg.created_at) {
                            timestamp = new Date(msg.created_at).getTime();
                        } else {
                            timestamp = Date.now(); // Fallback a ahora
                        }
                        
                        const parsedPayload = msg.payload ? JSON.parse(msg.payload) : null;
                        allMessages.push({
                            id: msg.id,
                            numero: msg.numero,
                            body: msg.body,
                            timestamp: timestamp,
                            created_at: msg.created_at,
                            type: 'received',
                            is_read: msg.is_read ?? 0,
                            payload: parsedPayload,
                            messageType: parsedPayload?.messageType || null,
                            mediaInfo: parsedPayload?.mediaInfo || null,
                        });
                    });
                }

                // Ordenar por timestamp (cronológico) - más antiguos primero
                allMessages.sort((a, b) => {
                    // Si los timestamps son iguales, ordenar por ID para mantener consistencia
                    if (a.timestamp === b.timestamp) {
                        return a.id - b.id;
                    }
                    return a.timestamp - b.timestamp;
                });

                resolve(allMessages);
            });
        });
    });
}

// Funciones CRUD para usuarios
function createUser({ nombre, correo, contraseña, estado = 'activo', createdBy = null, currentStatusId = null, userType = 2 }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `INSERT INTO users (nombre, correo, contraseña, estado, current_status_id, user_type, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [nombre, correo, contraseña, estado, currentStatusId, userType, createdBy], function (err) {
            if (err) {
                console.error('Error al crear usuario:', err);
                return reject(err);
            }

            resolve({ id: this.lastID });
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT id, nombre, correo, estado, current_status_id, user_type, created_at, updated_at, created_by, updated_by
            FROM users WHERE id = ?`;

        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('Error al obtener usuario:', err);
                return reject(err);
            }

            resolve(row || null);
        });
    });
}

function getUserByEmail(correo) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT id, nombre, correo, contraseña, estado, current_status_id, user_type, created_at, updated_at, created_by, updated_by
            FROM users WHERE correo = ?`;

        db.get(sql, [correo], (err, row) => {
            if (err) {
                console.error('Error al obtener usuario por correo:', err);
                return reject(err);
            }

            resolve(row || null);
        });
    });
}

function getAllUsers() {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT id, nombre, correo, estado, current_status_id, user_type, created_at, updated_at, created_by, updated_by
            FROM users ORDER BY created_at DESC`;

        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('Error al obtener usuarios:', err);
                return reject(err);
            }

            resolve(rows || []);
        });
    });
}

function updateUser(id, { nombre, correo, contraseña, estado, currentStatusId, userType, updatedBy = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const updates = [];
        const values = [];

        if (nombre !== undefined) {
            updates.push('nombre = ?');
            values.push(nombre);
        }
        if (correo !== undefined) {
            updates.push('correo = ?');
            values.push(correo);
        }
        if (contraseña !== undefined) {
            updates.push('contraseña = ?');
            values.push(contraseña);
        }
        if (estado !== undefined) {
            updates.push('estado = ?');
            values.push(estado);
        }
        if (currentStatusId !== undefined) {
            updates.push('current_status_id = ?');
            values.push(currentStatusId);
        }
        if (userType !== undefined) {
            updates.push('user_type = ?');
            values.push(userType);
        }
        if (updatedBy !== null) {
            updates.push('updated_by = ?');
            values.push(updatedBy);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

        db.run(sql, values, function (err) {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                return reject(err);
            }

            resolve({ changes: this.changes });
        });
    });
}

function deleteUser(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `DELETE FROM users WHERE id = ?`;

        db.run(sql, [id], function (err) {
            if (err) {
                console.error('Error al eliminar usuario:', err);
                return reject(err);
            }

            resolve({ changes: this.changes });
        });
    });
}

// Resumen de supervisión por usuario
function getUserSupervisionSummary() {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `
            SELECT 
                u.id,
                u.nombre,
                u.correo,
                u.user_type,
                us.codigo AS status_codigo,
                us.nombre AS status_nombre,
                us.color AS status_color,
                COALESCE(um.unread_contacts, 0) AS unread_messages,
                COALESCE(sm.sent_contacts, 0) AS sent_contacts
            FROM users u
            LEFT JOIN user_statuses us ON u.current_status_id = us.id
            LEFT JOIN (
                -- contactos del usuario que tienen al menos 1 mensaje sin leer
                SELECT 
                    c.user_id,
                    COUNT(DISTINCT r.from_number) AS unread_contacts
                FROM contactos c
                JOIN received_messages r
                    ON (r.from_number = c.numero 
                        OR r.from_number = c.numero || '@s.whatsapp.net' 
                        OR r.from_number LIKE c.numero || '@%')
                   AND (r.is_read IS NULL OR r.is_read = 0)
                GROUP BY c.user_id
            ) um ON um.user_id = u.id
            LEFT JOIN (
                SELECT 
                    user_id,
                    COUNT(DISTINCT numero_destino) AS sent_contacts
                FROM sent_messages
                GROUP BY user_id
            ) sm ON sm.user_id = u.id
            ORDER BY u.nombre ASC
        `;

        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('Error al obtener resumen de supervisión:', err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

// CRUD para tipos de estado de usuario
function createUserStatus({ nombre, codigo, descripcion = null, color = null, activo = 1, createdBy = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `INSERT INTO user_statuses (nombre, codigo, descripcion, color, activo, created_by)
            VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(sql, [nombre, codigo, descripcion, color, activo, createdBy], function (err) {
            if (err) {
                console.error('Error al crear estado de usuario:', err);
                return reject(err);
            }

            resolve({ id: this.lastID });
        });
    });
}

function getUserStatusById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT * FROM user_statuses WHERE id = ?`;
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('Error al obtener estado de usuario:', err);
                return reject(err);
            }
            resolve(row || null);
        });
    });
}

function getAllUserStatuses() {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT * FROM user_statuses ORDER BY nombre ASC`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('Error al obtener estados de usuario:', err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

function updateUserStatus(id, { nombre, codigo, descripcion, color, activo, updatedBy = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const updates = [];
        const values = [];

        if (nombre !== undefined) {
            updates.push('nombre = ?');
            values.push(nombre);
        }
        if (codigo !== undefined) {
            updates.push('codigo = ?');
            values.push(codigo);
        }
        if (descripcion !== undefined) {
            updates.push('descripcion = ?');
            values.push(descripcion);
        }
        if (color !== undefined) {
            updates.push('color = ?');
            values.push(color);
        }
        if (activo !== undefined) {
            updates.push('activo = ?');
            values.push(activo);
        }
        if (updatedBy !== null) {
            updates.push('updated_by = ?');
            values.push(updatedBy);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE user_statuses SET ${updates.join(', ')} WHERE id = ?`;

        db.run(sql, values, function (err) {
            if (err) {
                console.error('Error al actualizar estado de usuario:', err);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
}

function deleteUserStatus(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `DELETE FROM user_statuses WHERE id = ?`;

        db.run(sql, [id], function (err) {
            if (err) {
                console.error('Error al eliminar estado de usuario:', err);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
}

// Funciones CRUD para contactos
function createContacto({ nombreContacto, numero, observacion = null, createdBy = null, userId = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        // Si no se envía userId explícito, usar createdBy como respaldo
        const ownerUserId = userId || createdBy || null;

        const sql = `INSERT INTO contactos (nombre_contacto, numero, observacion, created_by, user_id)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(sql, [nombreContacto, numero, observacion, createdBy, ownerUserId], function (err) {
            if (err) {
                console.error('Error al crear contacto:', err);
                return reject(err);
            }

            resolve({ id: this.lastID });
        });
    });
}

function getContactoById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT 
            c.id, 
            c.nombre_contacto, 
            c.numero, 
            c.observacion, 
            c.created_at, 
            c.updated_at, 
            c.created_by, 
            c.updated_by,
            u1.nombre as created_by_nombre,
            u2.nombre as updated_by_nombre
        FROM contactos c
        LEFT JOIN users u1 ON c.created_by = u1.id
        LEFT JOIN users u2 ON c.updated_by = u2.id
        WHERE c.id = ?`;

        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('Error al obtener contacto:', err);
                return reject(err);
            }

            resolve(row || null);
        });
    });
}

function getContactoByNumero(numero) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        // Normalizar el número para buscar
        const numeroNormalizado = numero.replace('@s.whatsapp.net', '').replace('@c.us', '');

        const sql = `SELECT 
            c.id, 
            c.nombre_contacto, 
            c.numero, 
            c.observacion, 
            c.created_at, 
            c.updated_at, 
            c.created_by, 
            c.updated_by
        FROM contactos c
        WHERE c.numero = ? OR c.numero = ? OR c.numero LIKE ?`;

        const numeroConSufijo = `${numeroNormalizado}@s.whatsapp.net`;

        db.get(sql, [numeroNormalizado, numeroConSufijo, `${numeroNormalizado}@%`], (err, row) => {
            if (err) {
                console.error('Error al obtener contacto por número:', err);
                return reject(err);
            }

            resolve(row || null);
        });
    });
}

function getAllContactos(userId = null) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        let sql = `SELECT 
            c.id, 
            c.nombre_contacto, 
            c.numero, 
            c.observacion, 
            c.created_at, 
            c.updated_at, 
            c.created_by, 
            c.updated_by,
            c.user_id,
            u1.nombre as created_by_nombre,
            u2.nombre as updated_by_nombre,
            (
                SELECT COUNT(1)
                FROM received_messages r
                WHERE (r.from_number = c.numero 
                    OR r.from_number = c.numero || '@s.whatsapp.net' 
                    OR r.from_number LIKE c.numero || '@%')
                  AND (r.is_read IS NULL OR r.is_read = 0)
            ) AS unread_count
        FROM contactos c
        LEFT JOIN users u1 ON c.created_by = u1.id
        LEFT JOIN users u2 ON c.updated_by = u2.id`;

        const params = [];

        // Si se pasa userId, filtrar por contactos del usuario
        if (userId) {
            sql += ` WHERE c.user_id = ? OR c.created_by = ?`;
            params.push(userId, userId);
        }

        sql += ` ORDER BY c.created_at DESC`;

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error al obtener contactos:', err);
                return reject(err);
            }

            resolve(rows || []);
        });
    });
}

function updateContacto(id, { nombreContacto, numero, observacion, updatedBy = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const updates = [];
        const values = [];

        if (nombreContacto !== undefined) {
            updates.push('nombre_contacto = ?');
            values.push(nombreContacto);
        }
        if (numero !== undefined) {
            updates.push('numero = ?');
            values.push(numero);
        }
        if (observacion !== undefined) {
            updates.push('observacion = ?');
            values.push(observacion);
        }
        if (updatedBy !== null) {
            updates.push('updated_by = ?');
            values.push(updatedBy);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE contactos SET ${updates.join(', ')} WHERE id = ?`;

        db.run(sql, values, function (err) {
            if (err) {
                console.error('Error al actualizar contacto:', err);
                return reject(err);
            }

            resolve({ changes: this.changes });
        });
    });
}

function deleteContacto(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `DELETE FROM contactos WHERE id = ?`;

        db.run(sql, [id], function (err) {
            if (err) {
                console.error('Error al eliminar contacto:', err);
                return reject(err);
            }

            resolve({ changes: this.changes });
        });
    });
}

// Marcar mensajes recibidos como leídos por número
function markReceivedMessagesAsReadByNumber(numero) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const numeroNormalizado = numero.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const numeroConSufijo = `${numeroNormalizado}@s.whatsapp.net`;

        const sql = `UPDATE received_messages 
            SET is_read = 1 
            WHERE (from_number = ? OR from_number = ? OR from_number LIKE ?)`;

        db.run(sql, [numeroNormalizado, numeroConSufijo, `${numeroNormalizado}@%`], function (err) {
            if (err) {
                console.error('Error al marcar mensajes como leídos:', err);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
}

// Obtener lista de números con mensajes sin leer para un usuario
function getUnreadContactsByUser(userId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `
            SELECT DISTINCT
                c.id AS contacto_id,
                c.nombre_contacto,
                c.numero,
                (
                    SELECT COUNT(1)
                    FROM received_messages r
                    WHERE (r.from_number = c.numero
                           OR r.from_number = c.numero || '@s.whatsapp.net'
                           OR r.from_number LIKE c.numero || '@%')
                      AND (r.is_read IS NULL OR r.is_read = 0)
                ) AS unread_count,
                (
                    SELECT r2.message_body
                    FROM received_messages r2
                    WHERE (r2.from_number = c.numero
                           OR r2.from_number = c.numero || '@s.whatsapp.net'
                           OR r2.from_number LIKE c.numero || '@%')
                      AND (r2.is_read IS NULL OR r2.is_read = 0)
                    ORDER BY 
                        COALESCE(r2.timestamp * 1000, strftime('%s', r2.created_at) * 1000) DESC,
                        r2.id DESC
                    LIMIT 1
                ) AS last_message
            FROM contactos c
            WHERE c.user_id = ?
              AND (
                    SELECT COUNT(1)
                    FROM received_messages r
                    WHERE (r.from_number = c.numero
                           OR r.from_number = c.numero || '@s.whatsapp.net'
                           OR r.from_number LIKE c.numero || '@%')
                      AND (r.is_read IS NULL OR r.is_read = 0)
                  ) > 0
            ORDER BY c.nombre_contacto ASC
        `;

        db.all(sql, [userId], (err, rows) => {
            if (err) {
                console.error('Error al obtener contactos con mensajes sin leer:', err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

// CRUD para etiquetas
function createEtiqueta({ nombre, color = null, descripcion = null, activo = 1, createdBy = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `INSERT INTO etiquetas (nombre, color, descripcion, activo, created_by)
            VALUES (?, ?, ?, ?, ?)`;

        db.run(sql, [nombre, color, descripcion, activo, createdBy], function (err) {
            if (err) {
                console.error('Error al crear etiqueta:', err);
                return reject(err);
            }
            resolve({ id: this.lastID });
        });
    });
}

function getEtiquetaById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT * FROM etiquetas WHERE id = ?`;
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('Error al obtener etiqueta:', err);
                return reject(err);
            }
            resolve(row || null);
        });
    });
}

function getAllEtiquetas() {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT * FROM etiquetas ORDER BY nombre ASC`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('Error al obtener etiquetas:', err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

function updateEtiqueta(id, { nombre, color, descripcion, activo, updatedBy = null }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const updates = [];
        const values = [];

        if (nombre !== undefined) {
            updates.push('nombre = ?');
            values.push(nombre);
        }
        if (color !== undefined) {
            updates.push('color = ?');
            values.push(color);
        }
        if (descripcion !== undefined) {
            updates.push('descripcion = ?');
            values.push(descripcion);
        }
        if (activo !== undefined) {
            updates.push('activo = ?');
            values.push(activo);
        }
        if (updatedBy !== null) {
            updates.push('updated_by = ?');
            values.push(updatedBy);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE etiquetas SET ${updates.join(', ')} WHERE id = ?`;

        db.run(sql, values, function (err) {
            if (err) {
                console.error('Error al actualizar etiqueta:', err);
                return reject(err);
            }

            resolve({ changes: this.changes });
        });
    });
}

function deleteEtiqueta(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `DELETE FROM etiquetas WHERE id = ?`;

        db.run(sql, [id], function (err) {
            if (err) {
                console.error('Error al eliminar etiqueta:', err);
                return reject(err);
            }

            resolve({ changes: this.changes });
        });
    });
}

// Etiquetas por contacto
function getEtiquetasByContacto(contactoId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT e.*
            FROM contacto_etiquetas ce
            JOIN etiquetas e ON ce.etiqueta_id = e.id
            WHERE ce.contacto_id = ?
            ORDER BY e.nombre ASC`;

        db.all(sql, [contactoId], (err, rows) => {
            if (err) {
                console.error('Error al obtener etiquetas de contacto:', err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

function setEtiquetasForContacto(contactoId, etiquetaIds = []) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                `DELETE FROM contacto_etiquetas WHERE contacto_id = ?`,
                [contactoId],
                (err) => {
                    if (err) {
                        console.error('Error al borrar etiquetas de contacto:', err);
                        db.run('ROLLBACK');
                        return reject(err);
                    }

                    if (!etiquetaIds.length) {
                        db.run('COMMIT');
                        return resolve({ changes: 0 });
                    }

                    const stmt = db.prepare(
                        `INSERT OR IGNORE INTO contacto_etiquetas (contacto_id, etiqueta_id) VALUES (?, ?)`
                    );

                    etiquetaIds.forEach((tagId) => {
                        stmt.run([contactoId, tagId]);
                    });

                    stmt.finalize((err2) => {
                        if (err2) {
                            console.error('Error al insertar etiquetas de contacto:', err2);
                            db.run('ROLLBACK');
                            return reject(err2);
                        }
                        db.run('COMMIT');
                        resolve({ changes: etiquetaIds.length });
                    });
                }
            );
        });
    });
}

// Funciones para manejar ACK de mensajes
function saveMessageAck({ messageId, ackStatus, fromNumber, timestamp }) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        // Validar que el estado esté en el rango válido (0-4)
        if (ackStatus === null || ackStatus === undefined || ackStatus < 0 || ackStatus > 4) {
            return reject(new Error(`Estado de ACK inválido: ${ackStatus}`));
        }

        // Mapear estado numérico a texto
        // Corrección según el usuario:
        // 0 = PENDING (pendiente)
        // 1 = SERVER_ACK (enviado al servidor)
        // 2 = DELIVERY_ACK (entregado al dispositivo)
        // 3 = DELIVERY_ACK (entregado - estado intermedio)
        // 4 = READ (leído - el verdadero estado de leído)
        const statusMap = {
            0: 'PENDING',
            1: 'SERVER_ACK',
            2: 'DELIVERY_ACK',
            3: 'DELIVERY_ACK', // Estado 3 también es entregado según el usuario
            4: 'READ' // Estado 4 es el verdadero leído
        };
        const ackStatusText = statusMap[ackStatus];

        // Guardar statusMap en el scope de la función para usarlo en insertAck
        const statusMapRef = statusMap;

        // Buscar si ya existe un ACK con este messageId para obtener el sent_message_id
        // Si no existe, intentar encontrar el mensaje enviado más reciente para ese número
        const findAckQuery = `SELECT sent_message_id FROM message_acks WHERE message_id = ? LIMIT 1`;
        
        db.get(findAckQuery, [messageId], (err, existingAck) => {
            let sentMessageId = existingAck ? existingAck.sent_message_id : null;

            // Si no encontramos un match previo, intentar buscar por número (método menos preciso)
            if (!sentMessageId && fromNumber) {
                const numeroNormalizado = fromNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const findSentMessageQuery = `SELECT id FROM sent_messages WHERE numero_destino = ? ORDER BY created_at DESC LIMIT 1`;
                
                db.get(findSentMessageQuery, [numeroNormalizado], (err, sentMsg) => {
                    if (!err && sentMsg) {
                        sentMessageId = sentMsg.id;
                    }
                    insertAck();
                });
            } else {
                insertAck();
            }

            function insertAck() {
                // Verificar si ya existe un ACK con un estado más avanzado
                // Solo actualizar si el nuevo estado es mayor o igual al anterior
                // Progresión: PENDING(0) -> SERVER_ACK(1) -> DELIVERY_ACK(2) -> READ(3)
                const checkExistingQuery = `SELECT id, ack_status FROM message_acks WHERE message_id = ? ORDER BY created_at DESC LIMIT 1`;
                
                db.get(checkExistingQuery, [messageId], (err, existingAck) => {
                    if (err) {
                        console.error('Error al verificar ACK existente:', err);
                    }
                    
                    // Si ya existe un ACK con un estado más avanzado, no actualizar hacia atrás
                    if (existingAck && existingAck.ack_status > ackStatus) {
                        console.log(`⚠️ ACK ignorado (estado retrocede): ${messageId} - Actual: ${existingAck.ack_status}, Nuevo: ${ackStatus}`);
                        return resolve({ 
                            id: existingAck.id,
                            sentMessageId: sentMessageId,
                            messageId: messageId,
                            ackStatus: existingAck.ack_status,
                            ackStatusText: statusMap[existingAck.ack_status],
                            skipped: true,
                        });
                    }

                    // Insertar nuevo ACK (permitir múltiples ACK para historial, pero solo progresivos)
                    const sql = `INSERT INTO message_acks 
                        (message_id, sent_message_id, ack_status, ack_status_text, from_number, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?)`;

                    db.run(
                        sql,
                        [messageId, sentMessageId, ackStatus, ackStatusText, fromNumber || null, timestamp || null],
                        function (err) {
                            if (err) {
                                console.error('Error al guardar ACK:', err);
                                return reject(err);
                            }

                            // Si encontramos un mensaje enviado, actualizar su estado solo si es progresivo
                            if (sentMessageId) {
                                updateSentMessageDeliveryStatus(sentMessageId, ackStatusText);
                            }

                            resolve({ 
                                id: this.lastID,
                                sentMessageId: sentMessageId,
                                messageId: messageId,
                                ackStatus: ackStatus,
                                ackStatusText: ackStatusText,
                            });
                        }
                    );
                });
            }
        });
    });
}

function updateSentMessageDeliveryStatus(sentMessageId, deliveryStatus) {
    if (!db) return;

    // Actualizar el campo status en sent_messages con el estado de entrega
    const sql = `UPDATE sent_messages SET status = ? WHERE id = ?`;
    db.run(sql, [deliveryStatus, sentMessageId], (err) => {
        if (err) {
            console.error('Error al actualizar estado de entrega:', err);
        }
    });
}

function getMessageAcksByMessageId(messageId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT * FROM message_acks WHERE message_id = ? ORDER BY created_at DESC`;
        db.all(sql, [messageId], (err, rows) => {
            if (err) {
                console.error('Error al obtener ACKs:', err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

function getMessageAcksBySentMessageId(sentMessageId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error('Base de datos no inicializada'));
        }

        const sql = `SELECT * FROM message_acks WHERE sent_message_id = ? ORDER BY created_at DESC`;
        db.all(sql, [sentMessageId], (err, rows) => {
            if (err) {
                console.error('Error al obtener ACKs:', err);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

function getDb() {
    return db;
}

module.exports = {
    initDb,
    saveSentMessage,
    saveReceivedMessage,
    getMessagesByNumber,
    saveMessageAck,
    getMessageAcksByMessageId,
    getMessageAcksBySentMessageId,
    createUser,
    getUserById,
    getUserByEmail,
    getAllUsers,
    updateUser,
    deleteUser,
    createUserStatus,
    getUserStatusById,
    getAllUserStatuses,
    updateUserStatus,
    deleteUserStatus,
    createContacto,
    getContactoById,
    getContactoByNumero,
    getAllContactos,
    updateContacto,
    deleteContacto,
    createEtiqueta,
    getEtiquetaById,
    getAllEtiquetas,
    updateEtiqueta,
    deleteEtiqueta,
    getEtiquetasByContacto,
    setEtiquetasForContacto,
    markReceivedMessagesAsReadByNumber,
    getUserSupervisionSummary,
    getUnreadContactsByUser,
    getDb,
};

