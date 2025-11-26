# MVP API - Node.js, Postgres & Redis

Este projeto é uma API RESTful de exemplo (MVP) para gerenciamento de usuários, focada em demonstrar **Alta Performance** e **Boas Práticas** utilizando cache estratégico.

O sistema utiliza **PostgreSQL** para persistência segura de dados e **Redis** para cache de leitura, além de documentação automática com **Swagger**.

---

## 🚀 Tecnologias

-   **Node.js** (Express) - Backend
-   **PostgreSQL** (Docker) - Banco de Dados Relacional
-   **Redis** (Docker) - Banco de Dados em Memória (Cache)
-   **Redis Commander** (Docker) - Interface Gráfica para o Redis
-   **Swagger** - Documentação interativa da API
-   **Docker Compose** - Orquestração dos serviços

---

## 🛠️ Pré-requisitos

-   [Node.js](https://nodejs.org/) (v18+ recomendado)
-   [Docker](https://www.docker.com/) e Docker Compose

---

## ⚙️ Instalação e Configuração

### 1. Clone o repositório e instale as dependências

npm install

### 2. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as configurações abaixo (ajuste se necessário):

PORT=3000
Banco de Dados

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=mvp_db
Redis

REDIS_URL=redis://localhost:6379


### 3. Suba os serviços (Banco e Cache)
Utilize o Docker Compose para iniciar o PostgreSQL, Redis e Redis Commander:

> **Nota:** O Redis utiliza um arquivo de configuração customizado (`redis.conf`) para garantir segurança e otimização de memória (`allkeys-lru`).

### 4. Inicie a API

Modo Desenvolvimento (com auto-reload)

npm run dev

Ou produção

node index.js


---

## 📖 Documentação da API (Swagger)

Com a API rodando, acesse a documentação interativa para testar as rotas:

👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

---

## ⚡ Performance (Cache Strategy)

A API implementa o padrão **Cache-Aside**:

1.  **Leitura (GET /users):**
    -   Verifica se os dados estão no **Redis**.
    -   **Hit:** Retorna instantaneamente do cache (ms).
    -   **Miss:** Busca no Postgres, salva no Redis (TTL 60s) e retorna.
2.  **Escrita (POST/PUT/DELETE):**
    -   Atualiza o **PostgreSQL**.
    -   Invalida (apaga) o cache antigo no Redis para garantir consistência.

---

## 🖥️ Monitoramento e Ferramentas

### Redis Commander (Interface Visual)
Para visualizar, editar ou apagar chaves do Redis graficamente:

👉 **[http://localhost:8081](http://localhost:8081)**

### Comandos Úteis

-   **Parar serviços:** `docker-compose down`
-   **Ver logs do Redis:** `docker logs api_redis`
-   **Reiniciar Cache:** Basta apagar a chave `users:all` no Redis Commander ou reiniciar o container do Redis.

---

## 📂 Estrutura de Arquivos

-   `index.js`: Ponto de entrada, configuração do servidor e rotas.
-   `db.js`: Conexão com PostgreSQL (Pool).
-   `redisClient.js`: Cliente Redis com tratamento de reconexão e erros.
-   `docker-compose.yml`: Definição dos serviços (Db, Cache, GUI).
-   `redis.conf`: Configurações avançadas do Redis (limite de memória, persistência).
