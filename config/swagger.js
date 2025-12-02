const swaggerJsdoc = require('swagger-jsdoc');

function getSwaggerConfig(port) {
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Whatssy',
                version: '1.0.0',
                description:
                    'API para interactuar con WhatsApp Web usando whatsapp-web.js. ' +
                    'El endpoint de envío requiere una API key en el header x-api-key.',
                contact: {
                    name: 'API Support',
                },
            },
            servers: [
                {
                    url: `http://localhost:${port}`,
                    description: 'Servidor de desarrollo',
                },
            ],
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'x-api-key',
                        description: 'API key definida en la variable de entorno API_KEY',
                    },
                },
            },
            tags: [
                {
                    name: 'WhatsApp',
                    description: 'Endpoints para interactuar con WhatsApp',
                },
                {
                    name: 'Users',
                    description: 'Endpoints para gestión de usuarios',
                },
                {
                    name: 'Contactos',
                    description: 'Endpoints para gestión de contactos',
                },
            ],
        },
        apis: ['./routes/*.js', './controllers/*.js'], // Rutas donde buscar documentación
    };

    return swaggerJsdoc(swaggerOptions);
}

module.exports = {
    getSwaggerConfig,
};

