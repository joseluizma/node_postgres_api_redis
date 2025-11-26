const express = require('express');
const cors = require('cors');
const pool = require('./db');
// Importe o cliente Redis que criamos
const redisClient = require('./redisClient'); 
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// --- Configuração do Swagger ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Usuários (MVP)',
      version: '1.0.0',
      description: 'Documentação da API de exemplo com Postgres e Redis Cache',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            id: { type: 'integer', description: 'ID auto-gerado' },
            name: { type: 'string', description: 'Nome do usuário' },
            email: { type: 'string', description: 'Email do usuário' },
            created_at: { type: 'string', format: 'date-time' },
          },
          example: {
            id: 1,
            name: 'Joao Silva',
            email: 'joao@email.com',
            created_at: '2025-11-26T10:00:00.000Z',
          },
        },
      },
    },
  },
  apis: ['./index.js'], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(cors());
app.use(express.json());

// --- Inicialização do Banco ---
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabela users pronta/verificada.');
  } catch (err) {
    console.error('Erro ao iniciar DB:', err);
  }
};

initDb();

// --- Rotas (CRUD com Redis) ---

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retorna a lista de todos os usuários (com Cache Redis)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
app.get('/users', async (req, res) => {
  const cacheKey = 'users:all';

  try {
    // 1. Tenta buscar no cache
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache Hit: Dados vindos do Redis');
      return res.json(JSON.parse(cachedData));
    }

    // 2. Se não achou, busca no banco
    console.log('Cache Miss: Buscando no Postgres');
    const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
    
    // 3. Salva no Redis (expira em 60 segundos)
    await redisClient.set(cacheKey, JSON.stringify(result.rows), {
      EX: 60 
    });

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: integer }
 *         required: true
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuário não encontrado
 */
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cria um novo usuário e limpa o cache
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       201:
 *         description: Criado com sucesso
 */
app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    
    // Invalida o cache da lista para refletir o novo item
    await redisClient.del('users:all'); 

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza um usuário e limpa o cache
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: integer }
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Atualizado com sucesso
 */
app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Invalida o cache
    await redisClient.del('users:all');

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Remove um usuário e limpa o cache
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: integer }
 *         required: true
 *     responses:
 *       200:
 *         description: Removido com sucesso
 */
app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Invalida o cache
    await redisClient.del('users:all');

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
