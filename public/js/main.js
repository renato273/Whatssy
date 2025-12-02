const { createApp } = Vue;
const { createRouter, createWebHistory } = VueRouter;

// Componente Login
const Login = {
    template: `
        <div class="login-container">
            <div class="login-card">
                <h1>Whatssy</h1>
                <h2>Iniciar Sesión</h2>
                <form @submit.prevent="handleLogin" class="login-form">
                    <div class="form-group">
                        <label for="correo">Correo Electrónico</label>
                        <input
                            id="correo"
                            type="email"
                            v-model="correo"
                            required
                            placeholder="tu@correo.com"
                        />
                    </div>
                    <div class="form-group">
                        <label for="contraseña">Contraseña</label>
                        <input
                            id="contraseña"
                            type="password"
                            v-model="contraseña"
                            required
                            placeholder="Tu contraseña"
                        />
                    </div>
                    <div v-if="error" class="error-message">{{ error }}</div>
                    <button type="submit" :disabled="loading" class="btn btn-primary w-100">
                        {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
                    </button>
                </form>
            </div>
        </div>
    `,
    data() {
        return {
            correo: '',
            contraseña: '',
            error: '',
            loading: false,
        };
    },
    methods: {
        async handleLogin() {
            this.error = '';
            this.loading = true;

            try {
                const response = await apiService.login(this.correo, this.contraseña);
                
                // Guardar usuario y API key en localStorage
                localStorage.setItem('user', JSON.stringify(response.user));
                if (response.apiKey) {
                    localStorage.setItem('apiKey', response.apiKey);
                }
                
                // Redirigir al dashboard
                this.$router.push('/dashboard');
            } catch (error) {
                this.error = error.response?.data?.error || 'Error al iniciar sesión';
            } finally {
                this.loading = false;
            }
        },
    },
};

// Componente Dashboard (Chat)
const Dashboard = {
    template: `
        <div class="dashboard">
            <header class="dashboard-header">
                <h1>Whatssy</h1>
                <nav class="dashboard-nav">
                    <router-link to="/dashboard" class="nav-link" active-class="active">Chat</router-link>
                    <div v-if="isAdmin" class="nav-dropdown">
                        <button
                            type="button"
                            class="nav-dropdown-toggle"
                            @click="showMainMenu = !showMainMenu"
                        >
                            Panel admin ▾
                        </button>
                        <div v-if="showMainMenu" class="nav-dropdown-menu">
                            <router-link
                                to="/mis-contactos"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Mis contactos
                            </router-link>
                            <router-link
                                to="/estados-usuario"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Estados usuario
                            </router-link>
                            <router-link
                                to="/etiquetas"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Etiquetas
                            </router-link>
                            <router-link
                                to="/supervision"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Supervisión
                            </router-link>
                        </div>
                    </div>
                </nav>
                <div class="user-info">
                    <span>{{ user?.nombre }}</span>
                    <div v-if="statuses.length" class="user-status-dropdown">
                        <button type="button" class="btn btn-light btn-sm status-btn" @click="toggleStatusDropdown">
                            <span class="status-dot" :style="{ backgroundColor: currentStatusColor }"></span>
                            <span class="status-label">{{ currentStatusName }}</span>
                            <span class="status-caret">▾</span>
                        </button>
                        <div v-if="showStatusDropdown" class="status-menu">
                            <button
                                v-for="s in statuses"
                                :key="s.id"
                                type="button"
                                class="status-menu-item"
                                @click="selectStatus(s)"
                            >
                                <span class="status-dot" :style="{ backgroundColor: s.color || '#6b7280' }"></span>
                                <span class="status-label">{{ s.nombre }}</span>
                            </button>
                        </div>
                    </div>
                    <button @click="logout" class="btn btn-outline-light btn-sm">Cerrar Sesión</button>
                </div>
            </header>
            
            <div class="dashboard-content">
                <!-- Columna izquierda: Lista de contactos -->
                <div class="contacts-panel" :class="{ hidden: selectedContacto && isMobile() }">
                    <div class="contacts-header">
                        <h2>Contactos</h2>
                        <button @click="showAddContact = true" class="btn btn-success btn-sm">+ Nuevo</button>
                    </div>
                    <div class="contacts-list">
                        <div
                            v-for="contacto in contactos"
                            :key="contacto.id"
                            @click="selectContacto(contacto)"
                            :class="['contact-item', { active: selectedContacto?.id === contacto.id }]"
                        >
                            <div class="contact-avatar">{{ contacto.nombre_contacto.charAt(0).toUpperCase() }}</div>
                            <div class="contact-info">
                                <div class="contact-name">{{ contacto.nombre_contacto }}</div>
                                <div class="contact-number">
                                    {{ contacto.numero }}
                                    <span
                                        v-if="contacto.unread_count && contacto.unread_count > 0"
                                        class="badge-unread"
                                    >
                                        {{ contacto.unread_count }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div v-if="contactos.length === 0" class="empty-state">
                            No hay contactos. Agrega uno nuevo.
                        </div>
                    </div>
                </div>

                <!-- Columna derecha: Chat -->
                <div class="chat-panel" :class="{ hidden: !selectedContacto && isMobile() }">
                    <div v-if="!selectedContacto" class="chat-empty">
                        <p>Selecciona un contacto para ver la conversación</p>
                    </div>
                    <div v-else class="chat-container">
                        <div class="chat-header">
                            <button @click="goBackToContacts" class="btn-back" title="Volver a contactos">←</button>
                            <div class="chat-contact-info">
                                <div class="chat-avatar">{{ selectedContacto.nombre_contacto.charAt(0).toUpperCase() }}</div>
                                <div>
                                    <div class="chat-name">{{ selectedContacto.nombre_contacto }}</div>
                                    <div class="chat-number">{{ selectedContacto.numero }}</div>
                                    <div class="tag-list" v-if="contactTags.length">
                                        <span
                                            v-for="tag in contactTags"
                                            :key="tag.id"
                                            class="tag-pill"
                                            :style="{ backgroundColor: tag.color || '#e0e7ff', color: '#111827' }"
                                        >
                                            <span class="tag-dot" :style="{ backgroundColor: tag.color || '#4b5563' }"></span>
                                            {{ tag.nombre }}
                                        </span>
                                    </div>
                                    <button
                                        v-if="isAdmin"
                                        class="tag-edit-btn"
                                        type="button"
                                        @click="openTagModal"
                                    >
                                        Editar etiquetas
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-messages" ref="messagesContainer">
                            <div
                                v-for="message in messages"
                                :key="message.id"
                                :class="['message', message.type]"
                            >
                                <div class="message-content">
                                    <!-- Mensaje multimedia: Imagen -->
                                    <div v-if="message.mediaInfo && message.mediaInfo.type === 'image' && message.mediaInfo.path" class="message-media">
                                        <img :src="message.mediaInfo.path" :alt="message.body" class="media-image" @click="openMediaModal(message.mediaInfo.path, 'image')" />
                                        <div v-if="message.body && message.body !== '[Imagen]'" class="message-text">{{ message.body }}</div>
                                    </div>
                                    
                                    <!-- Mensaje multimedia: Video -->
                                    <div v-else-if="message.mediaInfo && message.mediaInfo.type === 'video' && message.mediaInfo.path" class="message-media">
                                        <video :src="message.mediaInfo.path" controls class="media-video" preload="metadata">
                                            Tu navegador no soporta videos.
                                        </video>
                                        <div v-if="message.body && message.body !== '[Video]'" class="message-text">{{ message.body }}</div>
                                    </div>
                                    
                                    <!-- Mensaje multimedia: Audio -->
                                    <div v-else-if="message.mediaInfo && message.mediaInfo.type === 'audio' && message.mediaInfo.path" class="message-media">
                                        <audio :src="message.mediaInfo.path" controls class="media-audio">
                                            Tu navegador no soporta audio.
                                        </audio>
                                        <div class="message-text">{{ message.body }}</div>
                                    </div>
                                    
                                    <!-- Mensaje multimedia: Documento -->
                                    <div v-else-if="message.mediaInfo && message.mediaInfo.type === 'document' && message.mediaInfo.path" class="message-media">
                                        <a :href="message.mediaInfo.path" :download="message.mediaInfo.filename" class="document-link">
                                            📄 {{ message.mediaInfo.filename || 'Documento' }}
                                            <span v-if="message.mediaInfo.size" class="file-size">({{ formatFileSize(message.mediaInfo.size) }})</span>
                                        </a>
                                        <div v-if="message.body && message.body !== message.mediaInfo.filename" class="message-text">{{ message.body }}</div>
                                    </div>
                                    
                                    <!-- Mensaje multimedia: Sticker -->
                                    <div v-else-if="message.mediaInfo && message.mediaInfo.type === 'sticker' && message.mediaInfo.path" class="message-media">
                                        <img :src="message.mediaInfo.path" alt="Sticker" class="media-sticker" @click="openMediaModal(message.mediaInfo.path, 'image')" />
                                    </div>
                                    
                                    <!-- Mensaje multimedia: Ubicación -->
                                    <div v-else-if="message.mediaInfo && message.mediaInfo.type === 'location'" class="message-media">
                                        <a :href="'https://www.google.com/maps?q=' + message.mediaInfo.latitude + ',' + message.mediaInfo.longitude" target="_blank" class="location-link">
                                            📍 Ver ubicación en Google Maps
                                        </a>
                                    </div>
                                    
                                    <!-- Mensaje de texto normal -->
                                    <div v-else class="message-text">{{ message.body }}</div>
                                    
                                    <div class="message-footer">
                                        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                                        <!-- Checks de estado de entrega (solo para mensajes enviados) -->
                                        <div v-if="message.type === 'sent'" class="message-status">
                                            <span v-if="message.delivery_status_code === 0 || !message.delivery_status_code" class="status-icon pending" title="Pendiente">✓</span>
                                            <span v-else-if="message.delivery_status_code === 1" class="status-icon server-ack" title="Enviado">✓</span>
                                            <span v-else-if="message.delivery_status_code === 2 || message.delivery_status_code === 3" class="status-icon delivered" title="Entregado">✓✓</span>
                                            <span v-else-if="message.delivery_status_code === 4" class="status-icon read" title="Leído">✓✓</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="messages.length === 0" class="empty-state">
                                No hay mensajes aún. Envía el primero.
                            </div>
                        </div>
                        
                        <div class="chat-input-container">
                            <input
                                v-model="newMessage"
                                @keyup.enter="sendMessage"
                                type="text"
                                placeholder="Escribe un mensaje..."
                                class="chat-input"
                            />
                            <button @click="sendMessage" :disabled="!newMessage.trim() || sending" class="btn btn-primary btn-send">
                                {{ sending ? 'Enviando...' : 'Enviar' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal para agregar contacto -->
            <div v-if="showAddContact" class="modal-overlay" @click="showAddContact = false">
                <div class="modal" @click.stop>
                    <h3>Nuevo Contacto</h3>
                    <form @submit.prevent="addContacto">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input v-model="newContacto.nombre_contacto" required />
                        </div>
                        <div class="form-group">
                            <label>Número</label>
                            <input v-model="newContacto.numero" required />
                        </div>
                        <div class="form-group">
                            <label>Observación</label>
                            <textarea v-model="newContacto.observacion"></textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" @click="showAddContact = false" class="btn btn-outline-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal para editar etiquetas de contacto -->
            <div v-if="showTagModal" class="modal-overlay" @click="closeTagModal">
                <div class="modal" @click.stop>
                    <h3>Etiquetas de {{ selectedContacto.nombre_contacto }}</h3>
                    <form @submit.prevent="saveContactTags">
                        <div class="form-group" v-if="etiquetas.length">
                            <label>Selecciona etiquetas</label>
                            <div>
                                <label v-for="tag in etiquetas" :key="tag.id" style="display:block; margin-bottom:4px;">
                                    <input
                                        type="checkbox"
                                        :value="tag.id"
                                        v-model="tagSelection"
                                    />
                                    <span class="tag-pill" :style="{ backgroundColor: tag.color || '#e0e7ff', color: '#111827' }">
                                        <span class="tag-dot" :style="{ backgroundColor: tag.color || '#4b5563' }"></span>
                                        {{ tag.nombre }}
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            No hay etiquetas configuradas. Crea etiquetas en el panel de administración.
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-secondary" @click="closeTagModal">Cancelar</button>
                            <button type="submit" class="btn btn-primary" :disabled="!etiquetas.length">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            user: null,
            contactos: [],
            selectedContacto: null,
            messages: [],
            newMessage: '',
            sending: false,
            showAddContact: false,
            newContacto: {
                nombre_contacto: '',
                numero: '',
                observacion: '',
                created_by: null,
                user_id: null,
            },
            refreshInterval: null,
            socket: null,
            resizeHandler: null,
            statuses: [],
            selectedStatusId: null,
            showStatusDropdown: false,
            etiquetas: [],
            contactTags: [],
            showTagModal: false,
            tagSelection: [],
            baseTitle: document.title || 'Whatssy',
            showMainMenu: false,
        };
    },
    computed: {
        isAdmin() {
            return this.user && this.user.user_type === 1;
        },
        currentStatus() {
            if (!this.statuses || !this.statuses.length || !this.selectedStatusId) return null;
            return this.statuses.find(s => s.id === this.selectedStatusId) || null;
        },
        currentStatusName() {
            return this.currentStatus?.nombre || 'Estado';
        },
        currentStatusColor() {
            return this.currentStatus?.color || '#6b7280';
        },
    },
    async mounted() {
        // Cargar usuario desde localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
            this.newContacto.created_by = this.user.id;
            this.newContacto.user_id = this.user.id;
        }

        // Cargar estados de usuario, etiquetas y contactos
        await Promise.all([this.loadStatuses(), this.loadEtiquetas(), this.loadContactos()]);

        // Conectar a Socket.io para mensajes en tiempo real
        this.socket = io('http://localhost:3000');
        
        // Escuchar actualizaciones de estado de mensajes
        this.socket.on('message_status_update', (update) => {
            // Actualizar el estado de entrega de un mensaje enviado
            const messageIndex = this.messages.findIndex(m => m.id === update.sentMessageId);
            if (messageIndex !== -1) {
                this.messages[messageIndex].delivery_status = update.deliveryStatus;
                this.messages[messageIndex].delivery_status_code = update.deliveryStatusCode;
            }
        });

        // Escuchar nuevos mensajes
        this.socket.on('new_message', (message) => {
            // Solo agregar el mensaje si corresponde al contacto seleccionado
            if (this.selectedContacto) {
                const numeroNormalizado = this.selectedContacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const messageNumero = message.numero || message.numeroCompleto?.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                if (numeroNormalizado === messageNumero) {
                    // Verificar si el mensaje ya existe (evitar duplicados)
                    const exists = this.messages.some(m => m.id === message.id);
                    if (!exists) {
                        // Asegurar que el timestamp esté en milisegundos
                        if (message.timestamp && message.timestamp < 1000000000000) {
                            // Si el timestamp está en segundos, convertirlo a milisegundos
                            message.timestamp = message.timestamp * 1000;
                        } else if (!message.timestamp && message.created_at) {
                            message.timestamp = new Date(message.created_at).getTime();
                        } else if (!message.timestamp) {
                            message.timestamp = Date.now();
                        }
                        
                        this.messages.push(message);
                        // Ordenar mensajes por timestamp (cronológico)
                        this.messages.sort((a, b) => {
                            const timestampA = a.timestamp || new Date(a.created_at).getTime() || 0;
                            const timestampB = b.timestamp || new Date(b.created_at).getTime() || 0;
                            if (timestampA === timestampB) {
                                return (a.id || 0) - (b.id || 0);
                            }
                            return timestampA - timestampB;
                        });
                        
                        // Scroll al final
                        this.$nextTick(() => {
                            const container = this.$refs.messagesContainer;
                            if (container) {
                                container.scrollTop = container.scrollHeight;
                            }
                        });
                    }
                }
            }

            // Siempre refrescar contactos para actualizar contadores de no leídos
            this.loadContactos();

            // Notificación visual del navegador para mensajes recibidos
            if (message.type === 'received') {
                this.showBrowserNotification(message);
            }
        });

        // Mantener polling como respaldo (cada 30 segundos en lugar de 5)
        this.refreshInterval = setInterval(() => {
            if (this.selectedContacto) {
                this.loadMessages();
            }
        }, 30000);

        // Listener para resize de ventana (para responsive)
        this.resizeHandler = () => {
            this.$forceUpdate(); // Forzar actualización de Vue para recalcular isMobile()
        };
        window.addEventListener('resize', this.resizeHandler);

        // Inicializar permisos de notificación
        this.initNotifications();
    },
    beforeUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
        // Remover listener de resize
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
    },
    methods: {
        toggleStatusDropdown() {
            this.showStatusDropdown = !this.showStatusDropdown;
        },
        async selectStatus(status) {
            this.selectedStatusId = status.id;
            this.showStatusDropdown = false;
            await this.changeStatus();
        },
        async loadStatuses() {
            try {
                const response = await apiService.getUserStatuses();
                this.statuses = response.statuses || [];

                // Si el usuario ya tiene estado asignado, seleccionarlo
                if (this.user && this.user.current_status_id) {
                    this.selectedStatusId = this.user.current_status_id;
                } else if (this.statuses.length) {
                    // Por defecto, seleccionar "En línea" si existe
                    const online = this.statuses.find(s => s.codigo === 'online') || this.statuses[0];
                    this.selectedStatusId = online.id;
                    await this.changeStatus();
                }
            } catch (error) {
                console.error('Error al cargar estados de usuario:', error);
            }
        },
        async loadEtiquetas() {
            try {
                const response = await apiService.getEtiquetas();
                this.etiquetas = response.etiquetas || [];
            } catch (error) {
                console.error('Error al cargar etiquetas:', error);
            }
        },
        async changeStatus() {
            if (!this.user || !this.selectedStatusId) return;
            try {
                const response = await apiService.updateUserStatus(this.user.id, this.selectedStatusId);
                if (response.user) {
                    this.user = response.user;
                    localStorage.setItem('user', JSON.stringify(this.user));
                }
            } catch (error) {
                console.error('Error al cambiar estado de usuario:', error);
                alert(error.response?.data?.error || 'Error al cambiar el estado');
            }
        },
        async loadContactos() {
            try {
                const response = await apiService.getContactos(this.user?.id);
                this.contactos = response.contactos || [];
            } catch (error) {
                console.error('Error al cargar contactos:', error);
            } finally {
                this.updatePageTitleWithUnread();
            }
        },
        async selectContacto(contacto) {
            this.selectedContacto = contacto;
            // Marcar mensajes de este número como leídos
            try {
                const numero = contacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '');
                await apiService.markMessagesAsRead(numero);
                await this.loadContactos();
            } catch (e) {
                console.error('Error al marcar mensajes como leídos:', e);
            }
            await this.loadContactTags();
            await this.loadMessages();
            // En móviles, el panel de contactos se oculta automáticamente por CSS
        },
        isMobile() {
            return window.innerWidth <= 768;
        },
        goBackToContacts() {
            this.selectedContacto = null;
            this.messages = [];
            this.contactTags = [];
            this.tagSelection = [];
        },
        async loadMessages() {
            if (!this.selectedContacto) return;

            try {
                const numero = this.selectedContacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const response = await apiService.getMessages(numero);
                let messages = response.messages || [];
                
                // Asegurar que los mensajes estén ordenados por timestamp
                messages.sort((a, b) => {
                    const timestampA = a.timestamp || new Date(a.created_at).getTime() || 0;
                    const timestampB = b.timestamp || new Date(b.created_at).getTime() || 0;
                    if (timestampA === timestampB) {
                        return (a.id || 0) - (b.id || 0);
                    }
                    return timestampA - timestampB;
                });
                
                this.messages = messages;
                
                // Scroll al final
                this.$nextTick(() => {
                    const container = this.$refs.messagesContainer;
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                });
            } catch (error) {
                console.error('Error al cargar mensajes:', error);
            }
        },
        async sendMessage() {
            if (!this.newMessage.trim() || !this.selectedContacto || this.sending) return;

            this.sending = true;
            const mensaje = this.newMessage.trim();
            this.newMessage = '';

            try {
                const numero = this.selectedContacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '');
                await apiService.sendMessage(numero, mensaje, this.user.id);
                
                // El mensaje se agregará automáticamente vía Socket.io
                // Solo recargamos si hay algún problema con Socket.io
                setTimeout(() => {
                    if (this.selectedContacto) {
                        this.loadMessages();
                    }
                }, 1000);
            } catch (error) {
                alert(error.response?.data?.error || 'Error al enviar el mensaje');
                this.newMessage = mensaje; // Restaurar el mensaje si falla
            } finally {
                this.sending = false;
            }
        },
        async loadContactTags() {
            if (!this.selectedContacto) {
                this.contactTags = [];
                return;
            }
            try {
                const response = await apiService.getEtiquetasByContacto(this.selectedContacto.id);
                this.contactTags = response.etiquetas || [];
                this.tagSelection = this.contactTags.map(t => t.id);
            } catch (error) {
                console.error('Error al cargar etiquetas del contacto:', error);
            }
        },
        openTagModal() {
            this.showTagModal = true;
        },
        closeTagModal() {
            this.showTagModal = false;
        },
        async saveContactTags() {
            if (!this.selectedContacto) return;
            try {
                await apiService.setEtiquetasForContacto(this.selectedContacto.id, this.tagSelection);
                await this.loadContactTags();
                this.closeTagModal();
            } catch (error) {
                console.error('Error al guardar etiquetas del contacto:', error);
                alert(error.response?.data?.error || 'Error al guardar etiquetas');
            }
        },
        // Notificaciones y título
        initNotifications() {
            if (!('Notification' in window)) return;
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        },
        showBrowserNotification(message) {
            if (!('Notification' in window)) return;
            if (Notification.permission !== 'granted') return;

            const contacto = this.contactos.find(c => {
                const num = c.numero.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const msgNum = (message.numero || message.numeroCompleto || '').replace('@s.whatsapp.net', '').replace('@c.us', '');
                return num === msgNum;
            });

            const title = contacto ? `Nuevo mensaje de ${contacto.nombre_contacto}` : 'Nuevo mensaje recibido';
            const body = message.body || '[Mensaje]';
            new Notification(title, { body });
        },
        updatePageTitleWithUnread() {
            const totalUnread = (this.contactos || []).reduce(
                (acc, c) => acc + (c.unread_count || 0),
                0
            );
            if (totalUnread > 0) {
                document.title = `(${totalUnread}) ${this.baseTitle}`;
            } else {
                document.title = this.baseTitle;
            }
        },
        async addContacto() {
            try {
                await apiService.createContacto(this.newContacto);
                this.showAddContact = false;
                this.newContacto = {
                    nombre_contacto: '',
                    numero: '',
                    observacion: '',
                    created_by: this.user.id,
                    user_id: this.user.id,
                };
                await this.loadContactos();
            } catch (error) {
                alert(error.response?.data?.error || 'Error al crear contacto');
            }
        },
        formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        },
        formatFileSize(bytes) {
            if (!bytes) return '';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        },
        openMediaModal(mediaPath, type) {
            // Abrir imagen/video en nueva ventana o modal
            window.open(mediaPath, '_blank');
        },
        logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('apiKey');
            this.$router.push('/login');
        },
    },
};

// Componente de listado de contactos del usuario
const ContactList = {
    template: `
        <div class="dashboard">
            <header class="dashboard-header">
                <h1>Whatssy</h1>
                <nav class="dashboard-nav">
                    <router-link to="/dashboard" class="nav-link" active-class="active">Chat</router-link>
                    <div v-if="isAdmin" class="nav-dropdown">
                        <button
                            type="button"
                            class="nav-dropdown-toggle"
                            @click="showMainMenu = !showMainMenu"
                        >
                            Panel admin ▾
                        </button>
                        <div v-if="showMainMenu" class="nav-dropdown-menu">
                            <router-link
                                to="/mis-contactos"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Mis contactos
                            </router-link>
                            <router-link
                                to="/estados-usuario"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Estados usuario
                            </router-link>
                            <router-link
                                to="/etiquetas"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Etiquetas
                            </router-link>
                            <router-link
                                to="/supervision"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Supervisión
                            </router-link>
                        </div>
                    </div>
                </nav>
                <div class="user-info">
                    <span>{{ user?.nombre }}</span>
                    <button @click="logout" class="btn-logout">Cerrar Sesión</button>
                </div>
            </header>

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Mis contactos</h2>
                        <div class="contacts-header-actions">
                            <button @click="openAddModal" class="btn btn-success btn-sm">+ Nuevo</button>
                            <button @click="loadContactos" class="btn btn-outline-secondary btn-sm">Recargar</button>
                        </div>
                    </div>
                    <div class="contacts-filters">
                        <input
                            v-model="search"
                            type="text"
                            placeholder="Buscar por nombre o número..."
                            class="search-input"
                        />
                    </div>
                    <table class="contacts-table" v-if="filteredContactos.length">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Número</th>
                                <th>Observación</th>
                                <th>Creado</th>
                                <th style="width: 140px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="c in filteredContactos" :key="c.id">
                                <td>{{ c.nombre_contacto }}</td>
                                <td>{{ c.numero }}</td>
                                <td>{{ c.observacion || '-' }}</td>
                                <td>{{ formatDate(c.created_at) }}</td>
                                <td>
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(c)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteContactoConfirm(c)">Eliminar</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-else class="empty-state">
                        No tienes contactos asignados todavía.
                    </div>
                </div>
            </div>

            <!-- Modal crear contacto -->
            <div v-if="showAddModal" class="modal-overlay" @click="closeModals">
                <div class="modal" @click.stop>
                    <h3>Nuevo contacto</h3>
                    <form @submit.prevent="createContacto">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input v-model="formContacto.nombre_contacto" required />
                        </div>
                        <div class="form-group">
                            <label>Número</label>
                            <input v-model="formContacto.numero" required />
                        </div>
                        <div class="form-group">
                            <label>Observación</label>
                            <textarea v-model="formContacto.observacion"></textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-secondary" @click="closeModals">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal editar contacto -->
            <div v-if="showEditModal" class="modal-overlay" @click="closeModals">
                <div class="modal" @click.stop>
                    <h3>Editar contacto</h3>
                    <form @submit.prevent="updateContactoSubmit">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input v-model="formContacto.nombre_contacto" required />
                        </div>
                        <div class="form-group">
                            <label>Número</label>
                            <input v-model="formContacto.numero" required />
                        </div>
                        <div class="form-group">
                            <label>Observación</label>
                            <textarea v-model="formContacto.observacion"></textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-secondary" @click="closeModals">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Actualizar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            user: null,
            contactos: [],
            search: '',
            loading: false,
            statuses: [],
            showAddModal: false,
            showEditModal: false,
            formContacto: {
                id: null,
                nombre_contacto: '',
                numero: '',
                observacion: '',
            },
            showMainMenu: false,
        };
    },
    computed: {
        isAdmin() {
            return this.user && this.user.user_type === 1;
        },
        filteredContactos() {
            const term = this.search.trim().toLowerCase();
            if (!term) return this.contactos;
            return this.contactos.filter(c => {
                return (
                    (c.nombre_contacto || '').toLowerCase().includes(term) ||
                    (c.numero || '').toLowerCase().includes(term)
                );
            });
        },
    },
    async mounted() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await Promise.all([this.loadStatuses(), this.loadContactos()]);
    },
    methods: {
        async loadStatuses() {
            try {
                const response = await apiService.getUserStatuses();
                this.statuses = response.statuses || [];
            } catch (error) {
                console.error('Error al cargar estados de usuario:', error);
            }
        },
        async loadContactos() {
            if (!this.user) return;
            try {
                this.loading = true;
                const response = await apiService.getContactos(this.user.id);
                this.contactos = response.contactos || [];
            } catch (error) {
                console.error('Error al cargar contactos:', error);
                alert('Error al cargar tus contactos');
            } finally {
                this.loading = false;
            }
        },
        openAddModal() {
            this.formContacto = {
                id: null,
                nombre_contacto: '',
                numero: '',
                observacion: '',
            };
            this.showAddModal = true;
            this.showEditModal = false;
        },
        openEditModal(contacto) {
            this.formContacto = {
                id: contacto.id,
                nombre_contacto: contacto.nombre_contacto,
                numero: contacto.numero,
                observacion: contacto.observacion || '',
            };
            this.showEditModal = true;
            this.showAddModal = false;
        },
        closeModals() {
            this.showAddModal = false;
            this.showEditModal = false;
        },
        async createContacto() {
            if (!this.user) return;
            try {
                await apiService.createContacto({
                    nombre_contacto: this.formContacto.nombre_contacto,
                    numero: this.formContacto.numero,
                    observacion: this.formContacto.observacion,
                    created_by: this.user.id,
                    user_id: this.user.id,
                });
                this.closeModals();
                await this.loadContactos();
            } catch (error) {
                alert(error.response?.data?.error || 'Error al crear contacto');
            }
        },
        async updateContactoSubmit() {
            if (!this.user || !this.formContacto.id) return;
            try {
                await apiService.updateContacto(this.formContacto.id, {
                    nombre_contacto: this.formContacto.nombre_contacto,
                    numero: this.formContacto.numero,
                    observacion: this.formContacto.observacion,
                    updated_by: this.user.id,
                });
                this.closeModals();
                await this.loadContactos();
            } catch (error) {
                alert(error.response?.data?.error || 'Error al actualizar contacto');
            }
        },
        async deleteContactoConfirm(contacto) {
            if (!confirm(`¿Eliminar el contacto "${contacto.nombre_contacto}"?`)) return;
            try {
                await apiService.deleteContacto(contacto.id);
                await this.loadContactos();
            } catch (error) {
                alert(error.response?.data?.error || 'Error al eliminar contacto');
            }
        },
        formatDate(value) {
            if (!value) return '';
            const d = new Date(value);
            return d.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        },
        logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('apiKey');
            this.$router.push('/login');
        },
    },
};

// Componente administración de estados de usuario (solo admin)
const UserStatusAdmin = {
    template: `
        <div class="dashboard">
            <header class="dashboard-header">
                <h1>Whatssy</h1>
                <nav class="dashboard-nav">
                    <router-link to="/dashboard" class="nav-link" active-class="active">Chat</router-link>
                    <div class="nav-dropdown">
                        <button
                            type="button"
                            class="nav-dropdown-toggle"
                            @click="showMainMenu = !showMainMenu"
                        >
                            Panel admin ▾
                        </button>
                        <div v-if="showMainMenu" class="nav-dropdown-menu">
                            <router-link
                                to="/mis-contactos"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Mis contactos
                            </router-link>
                            <router-link
                                to="/estados-usuario"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Estados usuario
                            </router-link>
                            <router-link
                                to="/etiquetas"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Etiquetas
                            </router-link>
                            <router-link
                                to="/supervision"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Supervisión
                            </router-link>
                        </div>
                    </div>
                </nav>
                <div class="user-info">
                    <span>{{ user?.nombre }}</span>
                    <button @click="logout" class="btn btn-outline-light btn-sm">Cerrar Sesión</button>
                </div>
            </header>

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Estados de usuario</h2>
                        <div class="contacts-header-actions">
                            <button @click="openAddModal" class="btn btn-success btn-sm">+ Nuevo</button>
                            <button @click="loadStatuses" class="btn btn-outline-secondary btn-sm">Recargar</button>
                        </div>
                    </div>

                    <table class="contacts-table" v-if="statuses.length">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Código</th>
                                <th>Color</th>
                                <th>Activo</th>
                                <th style="width: 140px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in statuses" :key="s.id">
                                <td>{{ s.nombre }}</td>
                                <td>{{ s.codigo }}</td>
                                <td>
                                    <span
                                        v-if="s.color"
                                        :style="{ backgroundColor: s.color, display: 'inline-block', width: '18px', height: '18px', borderRadius: '999px', border: '1px solid #e5e7eb' }"
                                    ></span>
                                </td>
                                <td>{{ s.activo ? 'Sí' : 'No' }}</td>
                                <td>
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(s)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteStatusConfirm(s)">Eliminar</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-else class="empty-state">
                        No hay estados configurados.
                    </div>
                </div>
            </div>

            <!-- Modal crear/editar estado -->
            <div v-if="showModal" class="modal-overlay" @click="closeModal">
                <div class="modal" @click.stop>
                    <h3>{{ isEdit ? 'Editar estado' : 'Nuevo estado' }}</h3>
                    <form @submit.prevent="saveStatus">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input v-model="form.nombre" required />
                        </div>
                        <div class="form-group">
                            <label>Código</label>
                            <input v-model="form.codigo" required :disabled="isEdit" />
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <input v-model="form.color" type="color" />
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea v-model="form.descripcion"></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" v-model="form.activo" />
                                Activo
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-secondary" @click="closeModal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            user: null,
            statuses: [],
            showModal: false,
            isEdit: false,
            form: {
                id: null,
                nombre: '',
                codigo: '',
                descripcion: '',
                color: '#16a34a',
                activo: true,
            },
            showMainMenu: false,
        };
    },
    async mounted() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await this.loadStatuses();
    },
    methods: {
        async loadStatuses() {
            try {
                const response = await apiService.getUserStatuses();
                this.statuses = response.statuses || [];
            } catch (error) {
                console.error('Error al cargar estados de usuario:', error);
                alert('Error al cargar estados de usuario');
            }
        },
        openAddModal() {
            this.isEdit = false;
            this.form = {
                id: null,
                nombre: '',
                codigo: '',
                descripcion: '',
                color: '#16a34a',
                activo: true,
            };
            this.showModal = true;
        },
        openEditModal(status) {
            this.isEdit = true;
            this.form = {
                id: status.id,
                nombre: status.nombre,
                codigo: status.codigo,
                descripcion: status.descripcion || '',
                color: status.color || '#16a34a',
                activo: !!status.activo,
            };
            this.showModal = true;
        },
        closeModal() {
            this.showModal = false;
        },
        async saveStatus() {
            try {
                if (this.isEdit && this.form.id) {
                    await apiService.updateUserStatusType(this.form.id, {
                        nombre: this.form.nombre,
                        codigo: this.form.codigo,
                        descripcion: this.form.descripcion,
                        color: this.form.color,
                        activo: this.form.activo ? 1 : 0,
                        updated_by: this.user?.id,
                    });
                } else {
                    await apiService.createUserStatus({
                        nombre: this.form.nombre,
                        codigo: this.form.codigo,
                        descripcion: this.form.descripcion,
                        color: this.form.color,
                        activo: this.form.activo ? 1 : 0,
                        created_by: this.user?.id,
                    });
                }
                this.closeModal();
                await this.loadStatuses();
            } catch (error) {
                console.error('Error al guardar estado de usuario:', error);
                alert(error.response?.data?.error || 'Error al guardar estado de usuario');
            }
        },
        async deleteStatusConfirm(status) {
            if (!confirm(`¿Eliminar el estado "${status.nombre}"?`)) return;
            try {
                await apiService.deleteUserStatus(status.id);
                await this.loadStatuses();
            } catch (error) {
                console.error('Error al eliminar estado de usuario:', error);
                alert(error.response?.data?.error || 'Error al eliminar estado de usuario');
            }
        },
        logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('apiKey');
            this.$router.push('/login');
        },
    },
};

// Componente administración de etiquetas (solo admin)
const TagAdmin = {
    template: `
        <div class="dashboard">
            <header class="dashboard-header">
                <h1>Whatssy</h1>
                <nav class="dashboard-nav">
                    <router-link to="/dashboard" class="nav-link" active-class="active">Chat</router-link>
                    <router-link to="/mis-contactos" class="nav-link" active-class="active">Mis contactos</router-link>
                    <router-link to="/estados-usuario" class="nav-link" active-class="active">Estados usuario</router-link>
                    <router-link to="/etiquetas" class="nav-link" active-class="active">Etiquetas</router-link>
                </nav>
                <div class="user-info">
                    <span>{{ user?.nombre }}</span>
                    <button @click="logout" class="btn btn-outline-light btn-sm">Cerrar Sesión</button>
                </div>
            </header>

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Etiquetas</h2>
                        <div class="contacts-header-actions">
                            <button @click="openAddModal" class="btn btn-success btn-sm">+ Nuevo</button>
                            <button @click="loadEtiquetas" class="btn btn-outline-secondary btn-sm">Recargar</button>
                        </div>
                    </div>

                    <table class="contacts-table" v-if="etiquetas.length">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Color</th>
                                <th>Activo</th>
                                <th style="width: 140px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="t in etiquetas" :key="t.id">
                                <td>{{ t.nombre }}</td>
                                <td>
                                    <span
                                        v-if="t.color"
                                        :style="{ backgroundColor: t.color, display: 'inline-block', width: '18px', height: '18px', borderRadius: '999px', border: '1px solid #e5e7eb' }"
                                    ></span>
                                </td>
                                <td>{{ t.activo ? 'Sí' : 'No' }}</td>
                                <td>
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(t)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteEtiquetaConfirm(t)">Eliminar</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-else class="empty-state">
                        No hay etiquetas configuradas.
                    </div>
                </div>
            </div>

            <!-- Modal crear/editar etiqueta -->
            <div v-if="showModal" class="modal-overlay" @click="closeModal">
                <div class="modal" @click.stop>
                    <h3>{{ isEdit ? 'Editar etiqueta' : 'Nueva etiqueta' }}</h3>
                    <form @submit.prevent="saveEtiqueta">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input v-model="form.nombre" required />
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <input v-model="form.color" type="color" />
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea v-model="form.descripcion"></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" v-model="form.activo" />
                                Activa
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-secondary" @click="closeModal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            user: null,
            etiquetas: [],
            showModal: false,
            isEdit: false,
            form: {
                id: null,
                nombre: '',
                color: '#6366f1',
                descripcion: '',
                activo: true,
            },
            showMainMenu: false,
        };
    },
    async mounted() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await this.loadEtiquetas();
    },
    methods: {
        async loadEtiquetas() {
            try {
                const response = await apiService.getEtiquetas();
                this.etiquetas = response.etiquetas || [];
            } catch (error) {
                console.error('Error al cargar etiquetas:', error);
                alert('Error al cargar etiquetas');
            }
        },
        openAddModal() {
            this.isEdit = false;
            this.form = {
                id: null,
                nombre: '',
                color: '#6366f1',
                descripcion: '',
                activo: true,
            };
            this.showModal = true;
        },
        openEditModal(tag) {
            this.isEdit = true;
            this.form = {
                id: tag.id,
                nombre: tag.nombre,
                color: tag.color || '#6366f1',
                descripcion: tag.descripcion || '',
                activo: !!tag.activo,
            };
            this.showModal = true;
        },
        closeModal() {
            this.showModal = false;
        },
        async saveEtiqueta() {
            try {
                if (this.isEdit && this.form.id) {
                    await apiService.updateEtiqueta(this.form.id, {
                        nombre: this.form.nombre,
                        color: this.form.color,
                        descripcion: this.form.descripcion,
                        activo: this.form.activo ? 1 : 0,
                    });
                } else {
                    await apiService.createEtiqueta({
                        nombre: this.form.nombre,
                        color: this.form.color,
                        descripcion: this.form.descripcion,
                        activo: this.form.activo ? 1 : 0,
                    });
                }
                this.closeModal();
                await this.loadEtiquetas();
            } catch (error) {
                console.error('Error al guardar etiqueta:', error);
                alert(error.response?.data?.error || 'Error al guardar etiqueta');
            }
        },
        async deleteEtiquetaConfirm(tag) {
            if (!confirm(`¿Eliminar la etiqueta "${tag.nombre}"?`)) return;
            try {
                await apiService.deleteEtiqueta(tag.id);
                await this.loadEtiquetas();
            } catch (error) {
                console.error('Error al eliminar etiqueta:', error);
                alert(error.response?.data?.error || 'Error al eliminar etiqueta');
            }
        },
        logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('apiKey');
            this.$router.push('/login');
        },
    },
};

// Componente panel de supervisión (solo admin)
const Supervision = {
    template: `
        <div class="dashboard">
            <header class="dashboard-header">
                <h1>WhatsApp Web API</h1>
                <nav class="dashboard-nav">
                    <router-link to="/dashboard" class="nav-link" active-class="active">Chat</router-link>
                    <div class="nav-dropdown">
                        <button
                            type="button"
                            class="nav-dropdown-toggle"
                            @click="showMainMenu = !showMainMenu"
                        >
                            Panel admin ▾
                        </button>
                        <div v-if="showMainMenu" class="nav-dropdown-menu">
                            <router-link
                                to="/mis-contactos"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Mis contactos
                            </router-link>
                            <router-link
                                to="/estados-usuario"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Estados usuario
                            </router-link>
                            <router-link
                                to="/etiquetas"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Etiquetas
                            </router-link>
                            <router-link
                                to="/supervision"
                                class="nav-dropdown-item"
                                @click.native="showMainMenu = false"
                            >
                                Supervisión
                            </router-link>
                        </div>
                    </div>
                </nav>
                <div class="user-info">
                    <span>{{ user?.nombre }}</span>
                    <button @click="logout" class="btn btn-outline-light btn-sm">Cerrar Sesión</button>
                </div>
            </header>

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Panel de supervisión</h2>
                        <div class="contacts-header-actions">
                            <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto;">
                                <option value="">Todos los estados</option>
                                <option v-for="s in statusOptions" :key="s.codigo" :value="s.codigo">
                                    {{ s.nombre }}
                                </option>
                            </select>
                            <button @click="loadData" class="btn btn-outline-secondary btn-sm">Recargar</button>
                        </div>
                    </div>

                    <table class="contacts-table" v-if="filteredUsers.length">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Correo</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Mensajes sin leer</th>
                                <th>Contactos con envío</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="u in filteredUsers" :key="u.id">
                                <td>{{ u.nombre }}</td>
                                <td>{{ u.correo }}</td>
                                <td>{{ u.user_type === 1 ? 'Admin' : 'Usuario' }}</td>
                                <td>
                                    <div v-if="u.status_nombre" class="status-cell">
                                        <span
                                            class="status-dot"
                                            :style="{ backgroundColor: getStatusColor(u) }"
                                        ></span>
                                        <span>{{ u.status_nombre }}</span>
                                    </div>
                                    <span v-else class="text-muted">Sin estado</span>
                                </td>
                                <td>
                                    <button
                                        v-if="u.unread_messages > 0"
                                        type="button"
                                        class="btn btn-outline-primary btn-sm"
                                        @click="loadUnreadContacts(u)"
                                    >
                                        {{ u.unread_messages }}
                                    </button>
                                    <span v-else>0</span>
                                </td>
                                <td>{{ u.sent_contacts }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-else class="empty-state">
                        No hay usuarios para mostrar.
                    </div>

                    <div v-if="unreadContacts.length" style="margin-top: 1.5rem;">
                        <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">
                            Contactos con mensajes sin leer de {{ selectedUserName }}
                        </h3>
                        <table class="contacts-table">
                            <thead>
                                <tr>
                                    <th>Nombre contacto</th>
                                    <th>Número</th>
                                    <th>Mensajes sin leer</th>
                                    <th>Último mensaje</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="c in unreadContacts" :key="c.contacto_id">
                                    <td>{{ c.nombre_contacto }}</td>
                                    <td>{{ c.numero }}</td>
                                    <td>{{ c.unread_count }}</td>
                                    <td>{{ c.last_message || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            user: null,
            users: [],
            filterStatus: '',
            statusOptions: [],
            showMainMenu: false,
            unreadContacts: [],
            selectedUserName: '',
        };
    },
    computed: {
        filteredUsers() {
            if (!this.filterStatus) return this.users;
            return this.users.filter(u => u.status_codigo === this.filterStatus);
        },
    },
    async mounted() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await this.loadData();
    },
    methods: {
        async loadData() {
            try {
                const [userRes, statusRes] = await Promise.all([
                    apiService.getSupervisionUsers(),
                    apiService.getUserStatuses(),
                ]);
                this.users = userRes.users || [];
                this.statusOptions = statusRes.statuses || [];
                this.unreadContacts = [];
                this.selectedUserName = '';
            } catch (error) {
                console.error('Error al cargar datos de supervisión:', error);
                alert('Error al cargar datos de supervisión');
            }
        },
        async loadUnreadContacts(user) {
            try {
                const res = await apiService.getUnreadContactsByUser(user.id);
                this.unreadContacts = res.contactos || [];
                this.selectedUserName = user.nombre;
            } catch (error) {
                console.error('Error al cargar contactos con mensajes sin leer:', error);
                alert('Error al cargar contactos con mensajes sin leer');
            }
        },
        getStatusColor(user) {
            const st = this.statusOptions.find(s => s.codigo === user.status_codigo);
            return st && st.color ? st.color : '#6b7280';
        },
        logout() {
            localStorage.removeItem('user');
            localStorage.removeItem('apiKey');
            this.$router.push('/login');
        },
    },
};
// Definir rutas
const routes = [
    { path: '/', redirect: '/login' },
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/mis-contactos', component: ContactList, meta: { requiresAuth: true } },
    { path: '/estados-usuario', component: UserStatusAdmin, meta: { requiresAuth: true, adminOnly: true } },
    { path: '/etiquetas', component: TagAdmin, meta: { requiresAuth: true, adminOnly: true } },
    { path: '/supervision', component: Supervision, meta: { requiresAuth: true, adminOnly: true } },
];

// Crear router
const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes,
});

// Guard de navegación para proteger rutas
router.beforeEach((to, from, next) => {
    const userStr = localStorage.getItem('user');
    const isAuthenticated = userStr !== null;
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login');
    } else if (to.meta.adminOnly && (!user || user.user_type !== 1)) {
        next('/dashboard');
    } else if (to.path === '/login' && isAuthenticated) {
        next('/dashboard');
    } else {
        next();
    }
});

// Crear aplicación Vue
const app = Vue.createApp({
    template: '<router-view></router-view>',
});

app.use(router);
app.mount('#app');
