// Configuración de la API
const API_BASE_URL = 'http://localhost:3000/api';

// Configurar axios
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar API key si está disponible
api.interceptors.request.use(
    (config) => {
        const apiKey = localStorage.getItem('apiKey');
        if (apiKey) {
            config.headers['x-api-key'] = apiKey;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de respuesta para manejar errores 404 silenciosamente en getQR
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si es un 404 en la ruta /whatsapp/qr, no es un error real (es normal cuando está conectado)
        if (error.config?.url?.includes('/whatsapp/qr') && error.response?.status === 404) {
            // Retornar una respuesta con qr: null en lugar de lanzar error
            return Promise.resolve({ data: { qr: null } });
        }
        return Promise.reject(error);
    }
);

// Servicios de API
const apiService = {
    // Autenticación
    async login(correo, contraseña) {
        const response = await api.post('/users/login', { correo, contraseña });
        return response.data;
    },

    // Usuarios
    async createUser(userData) {
        const response = await api.post('/users', userData);
        return response.data;
    },

    async getUserStatuses() {
        const response = await api.get('/user-statuses');
        return response.data;
    },

    async updateUserStatus(userId, statusId) {
        const response = await api.put(`/users/${userId}/status`, { status_id: statusId });
        return response.data;
    },

    async createUserStatus(statusData) {
        const response = await api.post('/user-statuses', statusData);
        return response.data;
    },

    async updateUserStatusType(id, statusData) {
        const response = await api.put(`/user-statuses/${id}`, statusData);
        return response.data;
    },

    async deleteUserStatus(id) {
        const response = await api.delete(`/user-statuses/${id}`);
        return response.data;
    },

    // Etiquetas
    async getEtiquetas() {
        const response = await api.get('/etiquetas');
        return response.data;
    },

    async createEtiqueta(etiquetaData) {
        const response = await api.post('/etiquetas', etiquetaData);
        return response.data;
    },

    async updateEtiqueta(id, etiquetaData) {
        const response = await api.put(`/etiquetas/${id}`, etiquetaData);
        return response.data;
    },

    async deleteEtiqueta(id) {
        const response = await api.delete(`/etiquetas/${id}`);
        return response.data;
    },

    async getEtiquetasByContacto(contactoId) {
        const response = await api.get(`/etiquetas/contacto/${contactoId}`);
        return response.data;
    },

    async setEtiquetasForContacto(contactoId, etiquetasIds) {
        const response = await api.post(`/etiquetas/contacto/${contactoId}`, {
            etiquetas: etiquetasIds,
        });
        return response.data;
    },

    // Contactos
    async getContactos(userId) {
        const response = await api.get('/contactos', {
            params: userId ? { userId } : {},
        });
        return response.data;
    },

    async getContacto(id) {
        const response = await api.get(`/contactos/${id}`);
        return response.data;
    },

    async createContacto(contactoData) {
        const response = await api.post('/contactos', contactoData);
        return response.data;
    },

    async updateContacto(id, contactoData) {
        const response = await api.put(`/contactos/${id}`, contactoData);
        return response.data;
    },

    async deleteContacto(id) {
        const response = await api.delete(`/contactos/${id}`);
        return response.data;
    },

    // Mensajes
    async getMessages(numero) {
        const response = await api.get(`/whatsapp/messages?numero=${encodeURIComponent(numero)}`);
        return response.data;
    },

    async markMessagesAsRead(numero) {
        const response = await api.post('/whatsapp/messages/read', { numero });
        return response.data;
    },

    // Supervisión
    async getSupervisionUsers() {
        const response = await api.get('/supervision/users');
        return response.data;
    },

    async getUnreadContactsByUser(userId) {
        const response = await api.get(`/supervision/users/${userId}/unread-contacts`);
        return response.data;
    },

    async sendMessage(numeroDestino, mensaje, userId) {
        const response = await api.post('/whatsapp/send', {
            numeroDestino,
            mensaje,
            userId,
        });
        return response.data;
    },

    async getQR() {
        const response = await api.get('/whatsapp/qr', {
            validateStatus: function (status) {
                // No lanzar error para 404 (es normal cuando está conectado)
                return status < 500;
            }
        });
        // Si es 404, devolver null
        if (response.status === 404) {
            return { qr: null };
        }
        return response.data;
    },
};

