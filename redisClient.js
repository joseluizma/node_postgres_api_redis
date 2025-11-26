const redis = require('redis');
require('dotenv').config();

// Configurações do cliente para evitar quedas de socket
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    // Aumenta o tempo antes de desistir da conexão inicial
    connectTimeout: 10000, 
    // Mantém a conexão viva enviando pacotes vazios a cada 10s
    keepAlive: 10000,
    // Se cair, tenta reconectar automaticamente
    reconnectStrategy: (retries) => {
      // Espera no máximo 3s entre tentativas
      return Math.min(retries * 50, 3000);
    }
  }
});

redisClient.on('error', (err) => {
  // Ignora erros de conexão fechada para não derrubar o app
  if (err.message === 'Socket closed unexpectedly') {
    console.log('Aviso: Redis fechou a conexão, tentando reconectar...');
  } else {
    console.error('Redis Client Error', err);
  }
});

redisClient.on('connect', () => console.log('Conectado ao Redis'));
redisClient.on('reconnecting', () => console.log('Reconectando ao Redis...'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Falha fatal ao conectar no Redis:', err);
  }
})();

module.exports = redisClient;
