function validateApiKey(req, res, next) {
    const apiKeyHeader = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;

    if (!validApiKey) {
        console.error('API_KEY no está definida en las variables de entorno');
        return res
            .status(500)
            .json({ error: 'Configuración de API_KEY faltante en el servidor' });
    }

    if (!apiKeyHeader || apiKeyHeader !== validApiKey) {
        return res.status(401).json({ error: 'API key inválida o no proporcionada' });
    }

    next();
}

module.exports = validateApiKey;

