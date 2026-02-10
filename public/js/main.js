const { createApp } = Vue;
const { createRouter, createWebHistory } = VueRouter;

// Componente Login
const Login = {
    template: `
        <div class="login-container">
            <div class="login-card">
                <div class="login-logo">W</div>
                <h1>Whatssy</h1>
                <h2>Inicia sesion para continuar</h2>
                <form @submit.prevent="handleLogin" class="login-form">
                    <div class="form-group">
                        <label for="correo">Correo electronico</label>
                        <input
                            id="correo"
                            type="email"
                            v-model="correo"
                            required
                            placeholder="tu@correo.com"
                            autocomplete="email"
                        />
                    </div>
                    <div class="form-group">
                        <label for="password">Contrasena</label>
                        <input
                            id="password"
                            type="password"
                            v-model="contraseña"
                            required
                            placeholder="Tu contrasena"
                            autocomplete="current-password"
                        />
                    </div>
                    <div v-if="error" class="error-message">{{ error }}</div>
                    <button type="submit" :disabled="loading" class="btn btn-primary btn-login">
                        <span v-if="loading" class="btn-loading">Ingresando...</span>
                        <span v-else>Iniciar sesion</span>
                    </button>
                </form>
                <div class="login-footer">
                    <span class="text-muted">Whatssy Messaging Platform</span>
                </div>
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
    mounted() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        document.body.classList.toggle('dark-mode', darkMode);
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
                this.error = error.response?.data?.error || 'Error al iniciar sesion';
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
                <div class="header-left">
                    <h1 class="header-logo">W<span class="logo-text">hatssy</span></h1>
                    <nav class="dashboard-nav">
                        <router-link to="/dashboard" class="nav-link" active-class="active">
                            <span class="nav-icon">💬</span>
                            <span class="nav-label">Chat</span>
                        </router-link>
                        <div v-if="isAdmin" class="nav-dropdown">
                            <button
                                type="button"
                                class="nav-dropdown-toggle"
                                @click="showMainMenu = !showMainMenu"
                            >
                                <span class="nav-icon">⚙️</span>
                                <span class="nav-label">Admin</span>
                                <span class="nav-caret">▾</span>
                            </button>
                            <div v-if="showMainMenu" class="nav-dropdown-menu">
                                <router-link to="/mis-contactos" class="nav-dropdown-item" @click.native="showMainMenu = false">
                                    Mis contactos
                                </router-link>
                                <router-link to="/estados-usuario" class="nav-dropdown-item" @click.native="showMainMenu = false">
                                    Estados usuario
                                </router-link>
                                <router-link to="/etiquetas" class="nav-dropdown-item" @click.native="showMainMenu = false">
                                    Etiquetas
                                </router-link>
                                <router-link to="/supervision" class="nav-dropdown-item" @click.native="showMainMenu = false">
                                    Supervisión
                                </router-link>
                            </div>
                        </div>
                    </nav>
                </div>
                <div class="header-right">
                    <div class="connection-indicator" :class="isWhatsAppConnected ? 'online' : 'offline'">
                        <span class="connection-dot"></span>
                        <span class="connection-text">{{ isWhatsAppConnected ? 'Conectado' : 'Desconectado' }}</span>
                    </div>
                    <div v-if="statuses.length" class="user-status-dropdown">
                        <button type="button" class="status-btn" @click="toggleStatusDropdown">
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
                    <button @click="toggleDarkMode" class="theme-toggle" :title="darkMode ? 'Modo claro' : 'Modo oscuro'">
                        {{ darkMode ? '☀️' : '🌙' }}
                    </button>
                    <div class="user-menu-dropdown">
                        <button type="button" class="user-menu-toggle" @click="showUserMenu = !showUserMenu">
                            <span class="user-avatar-sm">{{ (user?.nombre || 'U').charAt(0).toUpperCase() }}</span>
                            <span class="user-name-label">{{ user?.nombre || 'Usuario' }}</span>
                            <span class="nav-caret">▾</span>
                        </button>
                        <div v-if="showUserMenu" class="user-menu">
                            <div class="user-menu-header">
                                <span class="user-avatar-menu">{{ (user?.nombre || 'U').charAt(0).toUpperCase() }}</span>
                                <div>
                                    <div class="user-menu-name">{{ user?.nombre || 'Usuario' }}</div>
                                    <div class="user-menu-email">{{ user?.correo || '' }}</div>
                                </div>
                            </div>
                            <div class="user-menu-divider"></div>
                            <button type="button" class="user-menu-item" @click="openQRModal">
                                <span class="menu-icon">📱</span>
                                <span>Ver codigo QR</span>
                            </button>
                            <button type="button" class="user-menu-item danger" @click="logoutWhatsApp">
                                <span class="menu-icon">📴</span>
                                <span>Desconectar WhatsApp</span>
                            </button>
                            <div class="user-menu-divider"></div>
                            <button type="button" class="user-menu-item" @click="logout">
                                <span class="menu-icon">🚪</span>
                                <span>Cerrar sesion</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            
            <!-- Sistema de notificaciones toast -->
            <div class="toast-container">
                <div
                    v-for="toast in toasts"
                    :key="toast.id"
                    :class="'toast toast-' + toast.type"
                >
                    <div class="toast-content">
                        <span class="toast-icon">{{ toast.icon }}</span>
                        <span class="toast-message">{{ toast.message }}</span>
                    </div>
                    <button @click="removeToast(toast.id)" class="toast-close">×</button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <!-- Columna izquierda: Lista de contactos -->
                <div class="contacts-panel" :class="{ hidden: selectedContacto && isMobile() }">
                    <div class="contacts-header">
                        <h2>Contactos</h2>
                        <button @click="showAddContact = true" class="btn btn-success btn-sm">+ Nuevo</button>
                    </div>
                    <div class="contacts-search">
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Buscar contacto..."
                            class="search-input"
                        />
                    </div>
                    <div class="contacts-list">
                        <div
                            v-for="contacto in filteredContactos"
                            :key="contacto.id"
                            @click="selectContacto(contacto)"
                            :class="['contact-item', { active: selectedContacto?.id === contacto.id }]"
                        >
                            <div class="contact-avatar">
                                <img v-if="contacto.profilePicUrl" :src="contacto.profilePicUrl" alt="" class="avatar-img" />
                                <span v-else>{{ contacto.nombre_contacto.charAt(0).toUpperCase() }}</span>
                            </div>
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
                        <div v-if="filteredContactos.length === 0 && contactos.length > 0" class="empty-state">
                            No se encontraron contactos con "{{ searchQuery }}"
                        </div>
                        <div v-else-if="contactos.length === 0" class="empty-state">
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
                                <div class="chat-avatar">
                                    <img v-if="contactProfilePic" :src="contactProfilePic" alt="" class="avatar-img" />
                                    <span v-else>{{ selectedContacto.nombre_contacto.charAt(0).toUpperCase() }}</span>
                                </div>
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
                                    <div class="chat-header-actions">
                                        <button
                                            class="tag-edit-btn"
                                            type="button"
                                            @click="openEditContact"
                                            title="Editar contacto"
                                        >
                                            <span class="btn-icon">&#9998;</span>
                                            <span class="btn-label">Editar contacto</span>
                                        </button>
                                        <button
                                            v-if="isAdmin"
                                            class="tag-edit-btn"
                                            type="button"
                                            @click="openTagModal"
                                        >
                                            <span class="btn-icon">&#127991;</span>
                                            <span class="btn-label">Editar etiquetas</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-messages" ref="messagesContainer">
                            <template v-for="(group, dateKey) in groupedMessages" :key="dateKey">
                                <div class="message-date-divider">
                                    <span class="date-label">{{ formatDateLabel(dateKey) }}</span>
                                </div>
                                <div
                                    v-for="message in group"
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
                            </template>
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

            <!-- Modal para editar contacto -->
            <div v-if="showEditContact" class="modal-overlay" @click="showEditContact = false">
                <div class="modal" @click.stop>
                    <h3>Editar Contacto</h3>
                    <form @submit.prevent="editContactoSubmit">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input v-model="editContacto.nombre_contacto" required />
                        </div>
                        <div class="form-group">
                            <label>Numero</label>
                            <input v-model="editContacto.numero" required />
                        </div>
                        <div class="form-group">
                            <label>Observacion</label>
                            <textarea v-model="editContacto.observacion"></textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" @click="showEditContact = false" class="btn btn-outline-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Actualizar</button>
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

            <!-- Modal QR WhatsApp -->
            <div v-if="showQRModal" class="modal-overlay" @click="closeQRModal">
                <div class="modal qr-modal" @click.stop>
                    <div class="modal-header">
                        <h3>Conexion WhatsApp</h3>
                        <button type="button" class="modal-close" @click="closeQRModal">&times;</button>
                    </div>
                    <div class="qr-container">
                        <!-- Estado: Desconectando -->
                        <div v-if="waLoggingOut" class="qr-status-loading">
                            <div class="qr-status-icon spinner">⏳</div>
                            <p>Cerrando sesion de WhatsApp...</p>
                            <p class="qr-note">Se generara un nuevo codigo QR en unos segundos.</p>
                        </div>
                        <!-- Estado: Conectado -->
                        <div v-else-if="isWhatsAppConnected" class="qr-status-connected">
                            <div class="qr-status-icon">✅</div>
                            <h4>WhatsApp conectado</h4>
                            <p class="qr-status-note">Tu sesion de WhatsApp esta activa y funcionando correctamente.</p>
                            <button type="button" class="btn btn-danger btn-disconnect" @click="logoutWhatsApp">
                                📴 Desconectar y escanear nuevo QR
                            </button>
                        </div>
                        <!-- Estado: Cargando QR -->
                        <div v-else-if="qrLoading" class="qr-status-loading">
                            <div class="qr-status-icon spinner">⏳</div>
                            <p>Generando codigo QR...</p>
                        </div>
                        <!-- Estado: QR disponible -->
                        <div v-else-if="qrDataUrl" class="qr-code-content">
                            <div class="qr-instructions">
                                <strong>Para conectar WhatsApp:</strong>
                                <ol>
                                    <li>Abre WhatsApp en tu telefono</li>
                                    <li>Ve a <strong>Configuracion - Dispositivos vinculados</strong></li>
                                    <li>Toca <strong>Vincular un dispositivo</strong></li>
                                    <li>Escanea este codigo QR</li>
                                </ol>
                            </div>
                            <div class="qr-code-wrapper">
                                <img :src="qrDataUrl" alt="Codigo QR WhatsApp" class="qr-image" />
                            </div>
                            <p class="qr-note">El codigo se actualiza automaticamente</p>
                        </div>
                        <!-- Estado: Sin QR (esperando generacion) -->
                        <div v-else class="qr-status-loading">
                            <div class="qr-status-icon">📱</div>
                            <p>Esperando codigo QR del servidor...</p>
                            <button type="button" class="btn btn-primary btn-sm" @click="refreshQR">Reintentar</button>
                        </div>
                    </div>
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
            searchQuery: '',
            isWhatsAppConnected: false,
            darkMode: localStorage.getItem('darkMode') === 'true',
            toasts: [],
            toastIdCounter: 0,
            showQRModal: false,
            qrCode: null,
            qrDataUrl: null,
            qrLoading: false,
            qrRefreshInterval: null,
            waLoggingOut: false,
            showUserMenu: false,
            contactProfilePic: null,
            showEditContact: false,
            editContacto: {
                id: null,
                nombre_contacto: '',
                numero: '',
                observacion: '',
            },
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
        filteredContactos() {
            if (!this.searchQuery.trim()) {
                return this.contactos;
            }
            const query = this.searchQuery.toLowerCase();
            return this.contactos.filter(contacto => 
                contacto.nombre_contacto.toLowerCase().includes(query) ||
                contacto.numero.toLowerCase().includes(query)
            );
        },
        groupedMessages() {
            const groups = {};
            this.messages.forEach(message => {
                const date = new Date(message.timestamp || message.created_at);
                const dateKey = date.toDateString();
                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(message);
            });
            return groups;
        },
    },
    async mounted() {
        // Aplicar modo oscuro si está activado
        this.applyDarkMode();
        
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
        
        // Escuchar estado de conexión de WhatsApp
        this.socket.on('whatsapp_status', (status) => {
            const wasConnected = this.isWhatsAppConnected;
            this.isWhatsAppConnected = status.connected;
            
            // Si se desconectó, intentar cargar el QR
            if (!status.connected && wasConnected && this.showQRModal) {
                this.loadQR();
            }
            
            // Solo mostrar notificación si cambió el estado
            if (wasConnected !== status.connected) {
                if (status.connected) {
                    this.showToast('WhatsApp conectado', 'success', '✅');
                    this.qrCode = null;
                    this.qrDataUrl = null;
                } else {
                    this.showToast('WhatsApp desconectado', 'warning', '⚠️');
                }
            }
        });
        
        // Escuchar cuando hay un nuevo QR disponible
        this.socket.on('qr_available', (data) => {
            if (data.qr) {
                this.qrCode = data.qr;
                this.qrDataUrl = data.qrDataUrl || null;
                // Si estabamos esperando un QR tras logout, ya llego
                if (this.waLoggingOut) {
                    this.waLoggingOut = false;
                }
            }
        });
        
        this.socket.on('whatsapp_logged_out', () => {
            this.isWhatsAppConnected = false;
            this.qrCode = null;
            this.qrDataUrl = null;
        });
        
        // Verificar estado inicial
        this.checkWhatsAppStatus();
        
        // Verificar estado periódicamente cada 10 segundos
        setInterval(() => {
            this.checkWhatsAppStatus();
        }, 10000);
        
        // Escuchar actualizaciones de estado de mensajes
        this.socket.on('message_status_update', (update) => {
            // Actualizar el estado de entrega de un mensaje enviado
            const messageIndex = this.messages.findIndex(m => m.id === update.sentMessageId);
            if (messageIndex !== -1) {
                this.messages[messageIndex].delivery_status = update.deliveryStatus;
                this.messages[messageIndex].delivery_status_code = update.deliveryStatusCode;
            }
        });

        // Escuchar nuevos contactos auto-creados
        this.socket.on('contact_created', (contact) => {
            console.log('📇 Nuevo contacto auto-creado:', contact.nombre_contacto, contact.numero);
            // Recargar la lista de contactos para incluir el nuevo
            this.loadContactos();
            this.showToast(`Nuevo contacto: ${contact.nombre_contacto}`, 'info', '📇');
        });

        // Escuchar nuevos mensajes
        this.socket.on('new_message', (message) => {
            console.log('📩 new_message recibido:', JSON.stringify({
                id: message.id,
                numero: message.numero,
                body: message.body?.substring(0, 50),
                type: message.type,
                timestamp: message.timestamp
            }));
            
            // Normalizar número del mensaje (limpiar todos los sufijos posibles)
            const messageNumero = (message.numero || message.numeroCompleto?.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '') || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
            
            // Buscar el contacto correspondiente
            const contacto = this.contactos.find(c => {
                const num = c.numero.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
                return num === messageNumero;
            });
            
            console.log('📩 Contacto encontrado:', contacto?.nombre_contacto || 'NO ENCONTRADO', '| Seleccionado:', this.selectedContacto?.nombre_contacto || 'NINGUNO');
            
            // Normalizar número del contacto seleccionado (si hay uno)
            const numeroNormalizado = this.selectedContacto 
                ? this.selectedContacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '') 
                : '';
            
            // Si el contacto está seleccionado, agregar el mensaje al chat
            if (this.selectedContacto) {
                
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
            
            // Recargar contactos para actualizar contador de no leídos
            this.loadContactos();

            // Mostrar toast y notificación del navegador para mensajes recibidos
            if (message.type === 'received') {
                const contactoNombre = contacto?.nombre_contacto || messageNumero || 'Desconocido';
                const mensajePreview = message.body || '[Mensaje multimedia]';
                const preview = mensajePreview.length > 50 ? mensajePreview.substring(0, 50) + '...' : mensajePreview;
                
                // Mostrar toast solo si el contacto no está seleccionado actualmente
                if (!this.selectedContacto || numeroNormalizado !== messageNumero) {
                    this.showToast(`${contactoNombre}: ${preview}`, 'info', '💬');
                }
                
                // Notificación visual del navegador
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
        
        // Cerrar menús al hacer clic fuera
        this.clickOutsideHandler = (event) => {
            if (this.showUserMenu && !event.target.closest('.user-menu-dropdown')) {
                this.showUserMenu = false;
            }
            if (this.showStatusDropdown && !event.target.closest('.user-status-dropdown')) {
                this.showStatusDropdown = false;
            }
            if (this.showMainMenu && !event.target.closest('.nav-dropdown')) {
                this.showMainMenu = false;
            }
        };
        document.addEventListener('click', this.clickOutsideHandler);

        // Inicializar permisos de notificación
        this.initNotifications();
    },
    beforeUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.qrRefreshInterval) {
            clearInterval(this.qrRefreshInterval);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
        // Remover listener de resize
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        // Remover listener de clics fuera
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
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
                const contactos = response.contactos || [];
                // Initialize profilePicUrl for Vue reactivity
                contactos.forEach(c => { c.profilePicUrl = c.profilePicUrl || null; });
                this.contactos = contactos;
            } catch (error) {
                console.error('Error al cargar contactos:', error);
            } finally {
                this.updatePageTitleWithUnread();
            }
        },
        async selectContacto(contacto) {
            this.selectedContacto = contacto;
            this.contactProfilePic = contacto.profilePicUrl || null;
            
            // Marcar mensajes de este número como leídos
            try {
                const numero = contacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
                await apiService.markMessagesAsRead(numero);
                await this.loadContactos();
            } catch (e) {
                console.error('Error al marcar mensajes como leídos:', e);
            }
            await this.loadContactTags();
            await this.loadMessages();
            
            // Obtener foto de perfil de WhatsApp (en background, no bloquea)
            this.fetchProfilePic(contacto);
        },
        async fetchProfilePic(contacto) {
            try {
                const numero = contacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
                const result = await apiService.getProfilePicture(numero);
                if (result.profilePicUrl) {
                    this.contactProfilePic = result.profilePicUrl;
                    // Guardar en el contacto para cache en la lista
                    const idx = this.contactos.findIndex(c => c.id === contacto.id);
                    if (idx !== -1) {
                        this.contactos[idx].profilePicUrl = result.profilePicUrl;
                    }
                    if (this.selectedContacto && this.selectedContacto.id === contacto.id) {
                        this.selectedContacto.profilePicUrl = result.profilePicUrl;
                    }
                }
            } catch (error) {
                console.error('Error al obtener foto de perfil:', error);
            }
        },
        isMobile() {
            return window.innerWidth <= 768;
        },
        goBackToContacts() {
            this.selectedContacto = null;
            this.contactProfilePic = null;
            this.messages = [];
            this.contactTags = [];
            this.tagSelection = [];
        },
        async loadMessages() {
            if (!this.selectedContacto) return;

            try {
                const numero = this.selectedContacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
                const response = await apiService.getMessages(numero);
                let messages = response.messages || [];
                
                // Normalizar timestamps: convertir de segundos a milisegundos si es necesario
                messages.forEach(msg => {
                    if (msg.timestamp && typeof msg.timestamp === 'number' && msg.timestamp < 1e12) {
                        // Timestamp en segundos (epoch) → convertir a milisegundos
                        msg.timestamp = msg.timestamp * 1000;
                    } else if (!msg.timestamp && msg.created_at) {
                        msg.timestamp = new Date(msg.created_at).getTime();
                    }
                });
                
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
                const numero = this.selectedContacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
                await apiService.sendMessage(numero, mensaje, this.user.id);
                this.showToast('Mensaje enviado', 'success', '✓');
                
                // El mensaje se agregará automáticamente vía Socket.io
                // Solo recargamos si hay algún problema con Socket.io
                setTimeout(() => {
                    if (this.selectedContacto) {
                        this.loadMessages();
                    }
                }, 1000);
            } catch (error) {
                this.showToast(error.response?.data?.error || 'Error al enviar el mensaje', 'error', '✕');
                this.newMessage = mensaje; // Restaurar el mensaje si falla
            } finally {
                this.sending = false;
            }
        },
        // Métodos para notificaciones toast
        showToast(message, type = 'info', icon = 'ℹ️') {
            const toast = {
                id: ++this.toastIdCounter,
                message,
                type,
                icon,
            };
            this.toasts.push(toast);
            
            // Auto-remover después de 3 segundos
            setTimeout(() => {
                this.removeToast(toast.id);
            }, 3000);
        },
        removeToast(id) {
            const index = this.toasts.findIndex(t => t.id === id);
            if (index !== -1) {
                this.toasts.splice(index, 1);
            }
        },
        // Métodos para modo oscuro
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode.toString());
            this.applyDarkMode();
        },
        applyDarkMode() {
            if (this.darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        },
        // Métodos para indicador de conexión
        async checkWhatsAppStatus() {
            try {
                // Verificar estado del cliente de WhatsApp
                const response = await fetch('http://localhost:3000/api/whatsapp/status');
                if (response.ok) {
                    const data = await response.json();
                    this.isWhatsAppConnected = data.isReady || false;
                }
            } catch (error) {
                console.error('Error al verificar estado de WhatsApp:', error);
                this.isWhatsAppConnected = false;
            }
        },
        // Método para formatear etiquetas de fecha
        formatDateLabel(dateString) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const messageDate = new Date(dateString);
            
            if (messageDate.toDateString() === today.toDateString()) {
                return 'Hoy';
            } else if (messageDate.toDateString() === yesterday.toDateString()) {
                return 'Ayer';
            } else {
                const options = { day: 'numeric', month: 'long', year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined };
                return messageDate.toLocaleDateString('es-ES', options);
            }
        },
        // Métodos para modal QR
        async openQRModal() {
            this.showUserMenu = false;
            this.showQRModal = true;
            
            // Si ya está conectado, mostrar estado conectado
            if (this.isWhatsAppConnected) {
                this.qrCode = null;
                this.qrDataUrl = null;
                return;
            }
            
            // Si ya tenemos el QR (recibido por socket), mostrarlo directamente
            if (this.qrDataUrl) {
                return;
            }
            
            // Si no tenemos QR, cargarlo desde la API
            await this.loadQR();
            
            // Actualización periódica si no está conectado
            if (!this.isWhatsAppConnected) {
                this.qrRefreshInterval = setInterval(async () => {
                    if (this.showQRModal && !this.isWhatsAppConnected && !this.qrDataUrl) {
                        await this.loadQR();
                    }
                }, 10000);
            }
        },
        closeQRModal() {
            this.showQRModal = false;
            this.qrLoading = false;
            if (this.qrRefreshInterval) {
                clearInterval(this.qrRefreshInterval);
                this.qrRefreshInterval = null;
            }
        },
        async loadQR() {
            this.qrLoading = true;
            try {
                const response = await apiService.getQR();
                if (response && response.qr) {
                    this.qrCode = response.qr;
                    this.qrDataUrl = response.qrDataUrl || null;
                } else {
                    this.qrCode = null;
                    this.qrDataUrl = null;
                }
            } catch (error) {
                if (error.response?.status && error.response.status !== 404) {
                    console.error('Error al cargar QR:', error);
                }
                this.qrCode = null;
                this.qrDataUrl = null;
            } finally {
                this.qrLoading = false;
            }
        },
        async refreshQR() {
            this.qrCode = null;
            this.qrDataUrl = null;
            await this.loadQR();
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
                this.showToast('Contacto agregado exitosamente', 'success', '✓');
            } catch (error) {
                this.showToast(error.response?.data?.error || 'Error al crear contacto', 'error', '✕');
            }
        },
        openEditContact() {
            if (!this.selectedContacto) return;
            this.editContacto = {
                id: this.selectedContacto.id,
                nombre_contacto: this.selectedContacto.nombre_contacto,
                numero: this.selectedContacto.numero,
                observacion: this.selectedContacto.observacion || '',
            };
            this.showEditContact = true;
        },
        async editContactoSubmit() {
            if (!this.editContacto.id) return;
            try {
                await apiService.updateContacto(this.editContacto.id, {
                    nombre_contacto: this.editContacto.nombre_contacto,
                    numero: this.editContacto.numero,
                    observacion: this.editContacto.observacion,
                    updated_by: this.user?.id,
                });
                this.showEditContact = false;
                // Actualizar el contacto seleccionado y la lista
                this.selectedContacto.nombre_contacto = this.editContacto.nombre_contacto;
                this.selectedContacto.numero = this.editContacto.numero;
                this.selectedContacto.observacion = this.editContacto.observacion;
                await this.loadContactos();
                this.showToast('Contacto actualizado', 'success', '✓');
            } catch (error) {
                this.showToast(error.response?.data?.error || 'Error al actualizar contacto', 'error', '✕');
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
            this.showUserMenu = false;
            localStorage.removeItem('user');
            localStorage.removeItem('apiKey');
            this.$router.push('/login');
        },
        async logoutWhatsApp() {
            this.showUserMenu = false;
            if (!confirm('¿Deseas desconectar WhatsApp? Tendras que escanear un nuevo codigo QR para reconectar.')) {
                return;
            }
            this.waLoggingOut = true;
            this.showQRModal = true;
            this.qrCode = null;
            this.qrDataUrl = null;
            try {
                await apiService.logoutWhatsApp();
                this.isWhatsAppConnected = false;
                this.showToast('Sesion de WhatsApp cerrada. Esperando nuevo QR...', 'info', '📴');
            } catch (error) {
                console.error('Error al cerrar sesion de WhatsApp:', error);
                this.showToast('Error al cerrar sesion de WhatsApp', 'error');
                this.waLoggingOut = false;
            }
        },
    },
};

// Componente de listado de contactos del usuario
// Shared admin header template
const adminHeaderTemplate = `
    <header class="dashboard-header">
        <div class="header-left">
            <div class="header-logo"><h1>W<span class="logo-text">hatssy</span></h1></div>
            <nav class="dashboard-nav">
                <router-link to="/dashboard" class="nav-link" active-class="active">
                    <span class="nav-icon">&#128172;</span>
                    <span class="nav-label">Chat</span>
                </router-link>
                <div class="nav-dropdown">
                    <button type="button" class="nav-dropdown-toggle" @click="showMainMenu = !showMainMenu">
                        <span class="nav-icon">&#9881;</span>
                        <span class="nav-label">Admin</span>
                        <span class="nav-caret">&#9662;</span>
                    </button>
                    <div v-if="showMainMenu" class="nav-dropdown-menu">
                        <router-link to="/mis-contactos" class="nav-dropdown-item" @click.native="showMainMenu = false">Contactos</router-link>
                        <router-link to="/estados-usuario" class="nav-dropdown-item" @click.native="showMainMenu = false">Estados</router-link>
                        <router-link to="/etiquetas" class="nav-dropdown-item" @click.native="showMainMenu = false">Etiquetas</router-link>
                        <router-link to="/supervision" class="nav-dropdown-item" @click.native="showMainMenu = false">Supervision</router-link>
                    </div>
                </div>
            </nav>
        </div>
        <div class="header-right">
            <button class="theme-toggle" @click="toggleDarkMode" :title="darkMode ? 'Modo claro' : 'Modo oscuro'">
                {{ darkMode ? '&#9788;' : '&#9790;' }}
            </button>
            <div class="user-menu-toggle" @click="showUserMenu = !showUserMenu">
                <span class="user-avatar-sm">{{ user?.nombre?.charAt(0)?.toUpperCase() || 'U' }}</span>
                <span class="user-name-label">{{ user?.nombre }}</span>
            </div>
            <div v-if="showUserMenu" class="user-menu-dropdown">
                <div class="user-menu-header">
                    <span class="user-avatar-menu">{{ user?.nombre?.charAt(0)?.toUpperCase() || 'U' }}</span>
                    <div>
                        <div class="user-menu-name">{{ user?.nombre }}</div>
                        <div class="user-menu-email">{{ user?.correo }}</div>
                    </div>
                </div>
                <div class="user-menu-divider"></div>
                <button @click="logout" class="nav-dropdown-item" style="width:100%;text-align:left;border:none;background:none;cursor:pointer;">Cerrar sesion</button>
            </div>
        </div>
    </header>
`;

const ContactList = {
    template: `
        <div class="dashboard">
            ${adminHeaderTemplate}

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Todos los contactos</h2>
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
                    <!-- Desktop: tabla -->
                    <table class="contacts-table desktop-only" v-if="filteredContactos.length">
                        <thead>
                            <tr>
                                <th style="width: 50px;"></th>
                                <th>Nombre</th>
                                <th>Numero</th>
                                <th>Observacion</th>
                                <th>Creado</th>
                                <th style="width: 160px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="c in filteredContactos" :key="c.id">
                                <td>
                                    <div class="table-avatar">
                                        <img v-if="c.profilePicUrl" :src="c.profilePicUrl" alt="" class="avatar-img" />
                                        <span v-else>{{ c.nombre_contacto.charAt(0).toUpperCase() }}</span>
                                    </div>
                                </td>
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
                    <!-- Mobile: cards -->
                    <div class="contacts-cards mobile-only" v-if="filteredContactos.length">
                        <div class="contact-card" v-for="c in filteredContactos" :key="'card-' + c.id">
                            <div class="contact-card-header">
                                <div class="table-avatar">
                                    <img v-if="c.profilePicUrl" :src="c.profilePicUrl" alt="" class="avatar-img" />
                                    <span v-else>{{ c.nombre_contacto.charAt(0).toUpperCase() }}</span>
                                </div>
                                <div class="contact-card-info">
                                    <div class="contact-card-name">{{ c.nombre_contacto }}</div>
                                    <div class="contact-card-number">{{ c.numero }}</div>
                                </div>
                            </div>
                            <div class="contact-card-obs" v-if="c.observacion">{{ c.observacion }}</div>
                            <div class="contact-card-footer">
                                <span class="contact-card-date">{{ formatDate(c.created_at) }}</span>
                                <div class="contact-card-actions">
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(c)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteContactoConfirm(c)">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="!filteredContactos.length" class="empty-state">
                        No hay contactos registrados.
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
            darkMode: localStorage.getItem('darkMode') === 'true',
            showUserMenu: false,
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
        this.applyDarkMode();
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await Promise.all([this.loadStatuses(), this.loadContactos()]);
    },
    methods: {
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode);
            this.applyDarkMode();
        },
        applyDarkMode() {
            document.body.classList.toggle('dark-mode', this.darkMode);
        },
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
                const contactos = response.contactos || [];
                // Initialize profilePicUrl for reactivity
                contactos.forEach(c => { c.profilePicUrl = c.profilePicUrl || null; });
                this.contactos = contactos;
                // Fetch profile pics in background
                this.contactos.forEach(c => {
                    this.fetchProfilePic(c);
                });
            } catch (error) {
                console.error('Error al cargar contactos:', error);
                alert('Error al cargar tus contactos');
            } finally {
                this.loading = false;
            }
        },
        async fetchProfilePic(contacto) {
            try {
                const numero = contacto.numero.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
                const result = await apiService.getProfilePicture(numero);
                if (result.profilePicUrl) {
                    contacto.profilePicUrl = result.profilePicUrl;
                }
            } catch (e) { /* silently ignore */ }
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
            ${adminHeaderTemplate}

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Estados de usuario</h2>
                        <div class="contacts-header-actions">
                            <button @click="openAddModal" class="btn btn-success btn-sm">+ Nuevo</button>
                            <button @click="loadStatuses" class="btn btn-outline-secondary btn-sm">Recargar</button>
                        </div>
                    </div>

                    <table class="contacts-table desktop-only" v-if="statuses.length">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Codigo</th>
                                <th>Color</th>
                                <th>Activo</th>
                                <th style="width: 140px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in statuses" :key="s.id">
                                <td>{{ s.nombre }}</td>
                                <td><code class="code-badge">{{ s.codigo }}</code></td>
                                <td>
                                    <span v-if="s.color" class="color-swatch" :style="{ backgroundColor: s.color }"></span>
                                </td>
                                <td><span :class="['status-badge', s.activo ? 'active' : 'inactive']">{{ s.activo ? 'Activo' : 'Inactivo' }}</span></td>
                                <td>
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(s)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteStatusConfirm(s)">Eliminar</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="contacts-cards mobile-only" v-if="statuses.length">
                        <div class="contact-card" v-for="s in statuses" :key="'card-' + s.id">
                            <div class="contact-card-header">
                                <span v-if="s.color" class="color-swatch-lg" :style="{ backgroundColor: s.color }"></span>
                                <div class="contact-card-info">
                                    <div class="contact-card-name">{{ s.nombre }}</div>
                                    <div class="contact-card-number"><code class="code-badge">{{ s.codigo }}</code></div>
                                </div>
                                <span :class="['status-badge', s.activo ? 'active' : 'inactive']">{{ s.activo ? 'Activo' : 'Inactivo' }}</span>
                            </div>
                            <div class="contact-card-obs" v-if="s.descripcion">{{ s.descripcion }}</div>
                            <div class="contact-card-footer">
                                <div class="contact-card-actions">
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(s)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteStatusConfirm(s)">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="!statuses.length" class="empty-state">
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
            darkMode: localStorage.getItem('darkMode') === 'true',
            showUserMenu: false,
        };
    },
    async mounted() {
        this.applyDarkMode();
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await this.loadStatuses();
    },
    methods: {
        toggleDarkMode() { this.darkMode = !this.darkMode; localStorage.setItem('darkMode', this.darkMode); this.applyDarkMode(); },
        applyDarkMode() { document.body.classList.toggle('dark-mode', this.darkMode); },
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
            ${adminHeaderTemplate}

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Etiquetas</h2>
                        <div class="contacts-header-actions">
                            <button @click="openAddModal" class="btn btn-success btn-sm">+ Nuevo</button>
                            <button @click="loadEtiquetas" class="btn btn-outline-secondary btn-sm">Recargar</button>
                        </div>
                    </div>

                    <table class="contacts-table desktop-only" v-if="etiquetas.length">
                        <thead>
                            <tr>
                                <th>Color</th>
                                <th>Nombre</th>
                                <th>Descripcion</th>
                                <th>Activo</th>
                                <th style="width: 140px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="t in etiquetas" :key="t.id">
                                <td><span v-if="t.color" class="color-swatch" :style="{ backgroundColor: t.color }"></span></td>
                                <td><strong>{{ t.nombre }}</strong></td>
                                <td class="text-muted">{{ t.descripcion || '-' }}</td>
                                <td><span :class="['status-badge', t.activo ? 'active' : 'inactive']">{{ t.activo ? 'Activa' : 'Inactiva' }}</span></td>
                                <td>
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(t)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteEtiquetaConfirm(t)">Eliminar</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="contacts-cards mobile-only" v-if="etiquetas.length">
                        <div class="contact-card" v-for="t in etiquetas" :key="'card-' + t.id">
                            <div class="contact-card-header">
                                <span v-if="t.color" class="color-swatch-lg" :style="{ backgroundColor: t.color }"></span>
                                <div class="contact-card-info">
                                    <div class="contact-card-name">{{ t.nombre }}</div>
                                    <div class="contact-card-number text-muted">{{ t.descripcion || 'Sin descripcion' }}</div>
                                </div>
                                <span :class="['status-badge', t.activo ? 'active' : 'inactive']">{{ t.activo ? 'Activa' : 'Inactiva' }}</span>
                            </div>
                            <div class="contact-card-footer">
                                <div class="contact-card-actions">
                                    <button class="btn btn-outline-primary btn-small" @click="openEditModal(t)">Editar</button>
                                    <button class="btn btn-danger btn-small ms-1" @click="deleteEtiquetaConfirm(t)">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="!etiquetas.length" class="empty-state">
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
            darkMode: localStorage.getItem('darkMode') === 'true',
            showUserMenu: false,
        };
    },
    async mounted() {
        this.applyDarkMode();
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await this.loadEtiquetas();
    },
    methods: {
        toggleDarkMode() { this.darkMode = !this.darkMode; localStorage.setItem('darkMode', this.darkMode); this.applyDarkMode(); },
        applyDarkMode() { document.body.classList.toggle('dark-mode', this.darkMode); },
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
            ${adminHeaderTemplate}

            <div class="dashboard-content contact-list-page">
                <div class="contacts-table-card">
                    <div class="contacts-header">
                        <h2>Supervision</h2>
                        <div class="contacts-header-actions">
                            <select v-model="filterStatus" class="filter-select">
                                <option value="">Todos los estados</option>
                                <option v-for="s in statusOptions" :key="s.codigo" :value="s.codigo">
                                    {{ s.nombre }}
                                </option>
                            </select>
                            <button @click="loadData" class="btn btn-outline-secondary btn-sm">Recargar</button>
                        </div>
                    </div>

                    <!-- Desktop table -->
                    <table class="contacts-table desktop-only" v-if="filteredUsers.length">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Correo</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Sin leer</th>
                                <th>Enviados</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="u in filteredUsers" :key="u.id">
                                <td><strong>{{ u.nombre }}</strong></td>
                                <td class="text-muted">{{ u.correo }}</td>
                                <td><span :class="['role-badge', u.user_type === 1 ? 'admin' : 'user']">{{ u.user_type === 1 ? 'Admin' : 'Usuario' }}</span></td>
                                <td>
                                    <div v-if="u.status_nombre" class="status-cell">
                                        <span class="status-dot" :style="{ backgroundColor: getStatusColor(u) }"></span>
                                        <span>{{ u.status_nombre }}</span>
                                    </div>
                                    <span v-else class="text-muted">Sin estado</span>
                                </td>
                                <td>
                                    <button v-if="u.unread_messages > 0" type="button" class="unread-badge" @click="loadUnreadContacts(u)">
                                        {{ u.unread_messages }}
                                    </button>
                                    <span v-else class="text-muted">0</span>
                                </td>
                                <td>{{ u.sent_contacts }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Mobile cards -->
                    <div class="contacts-cards mobile-only" v-if="filteredUsers.length">
                        <div class="contact-card supervision-card" v-for="u in filteredUsers" :key="'card-' + u.id">
                            <div class="contact-card-header">
                                <span class="user-avatar-sm">{{ u.nombre?.charAt(0)?.toUpperCase() || 'U' }}</span>
                                <div class="contact-card-info">
                                    <div class="contact-card-name">{{ u.nombre }}</div>
                                    <div class="contact-card-number text-muted">{{ u.correo }}</div>
                                </div>
                                <span :class="['role-badge', u.user_type === 1 ? 'admin' : 'user']">{{ u.user_type === 1 ? 'Admin' : 'Usuario' }}</span>
                            </div>
                            <div class="supervision-card-stats">
                                <div class="stat-item">
                                    <div v-if="u.status_nombre" class="status-cell">
                                        <span class="status-dot" :style="{ backgroundColor: getStatusColor(u) }"></span>
                                        <span>{{ u.status_nombre }}</span>
                                    </div>
                                    <span v-else class="text-muted">Sin estado</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Sin leer</span>
                                    <button v-if="u.unread_messages > 0" type="button" class="unread-badge" @click="loadUnreadContacts(u)">
                                        {{ u.unread_messages }}
                                    </button>
                                    <span v-else class="text-muted">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Enviados</span>
                                    <span>{{ u.sent_contacts }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="!filteredUsers.length" class="empty-state">
                        No hay usuarios para mostrar.
                    </div>

                    <div v-if="unreadContacts.length" class="unread-section">
                        <h3 class="unread-section-title">
                            Contactos sin leer de {{ selectedUserName }}
                        </h3>
                        <table class="contacts-table">
                            <thead>
                                <tr>
                                    <th>Contacto</th>
                                    <th>Numero</th>
                                    <th>Sin leer</th>
                                    <th>Ultimo mensaje</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="c in unreadContacts" :key="c.contacto_id">
                                    <td><strong>{{ c.nombre_contacto }}</strong></td>
                                    <td class="text-muted">{{ c.numero }}</td>
                                    <td><span class="unread-badge">{{ c.unread_count }}</span></td>
                                    <td class="text-muted">{{ c.last_message || '-' }}</td>
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
            darkMode: localStorage.getItem('darkMode') === 'true',
            showUserMenu: false,
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
        this.applyDarkMode();
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }
        await this.loadData();
    },
    methods: {
        toggleDarkMode() { this.darkMode = !this.darkMode; localStorage.setItem('darkMode', this.darkMode); this.applyDarkMode(); },
        applyDarkMode() { document.body.classList.toggle('dark-mode', this.darkMode); },
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