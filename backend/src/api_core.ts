import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg'; // Driver do PostgreSQL
import { randomUUID } from 'crypto';

// --- CONFIGURAÇÃO DE TIPAGEM ---
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      workspaceId: string;
    };
  }
}

// --- LOGGING ---
const structuredLogger = (level: string, message: string, data: any = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'ArcaneTasks-API',
    message,
    ...data,
  }));
};

// --- CONEXÃO COM O BANCO DE DADOS ---
// Ajuste as credenciais conforme a sua instalação local
const pool = new Pool({
  user: 'postgres',      // Seu usuário do Postgres
  host: 'localhost',
  database: 'arcanedb',  // O banco que criamos
  password: '1490',      // <--- SENHA ATUALIZADA AQUI
  port: 5432,
  // Configuração para SSL (obrigatório na maioria dos bancos cloud em produção)
  // Localmente (NODE_ENV não definido ou development), ssl é falso.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper para executar transações com contexto de segurança (RLS)
const executeWithRLS = async (workspaceId: string, operation: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Define o contexto da sessão para o RLS funcionar (conforme definido no schema.sql)
    await client.query("SELECT set_config('app.current_workspace_id', $1, true)", [workspaceId]);

    const result = await operation(client);

    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// --- MOCK DE EVENT BUS (Para manter a arquitetura) ---
const eventBus = {
  emit: async (topic: string, event: any) => {
    structuredLogger('info', `EVENTO_EMITIDO`, { topic, eventId: randomUUID(), payload: event });
  }
}

// --- SERVIDOR FASTIFY ---
const server: FastifyInstance = Fastify({ logger: false });

// Habilita CORS
server.register(cors, {
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "If-Match", "Authorization"],
  exposedHeaders: ["ETag"] // Importante para o Optimistic Locking
});

// Middleware de Autenticação (Simulado)
// Injeta o ID do workspace que criamos no SQL ('1c3b9f4a...')
server.decorateRequest('user', {
    getter: () => ({
        userId: '99999999-9999-49c0-9eda-3e26b08d3fe6', // O ID válido que inserimos no SQL
        workspaceId: '1c3b9f4a-7d2e-4c5a-8b1e-0a5d4c3f2b1a' // Workspace "Desenvolvimento Principal"
    })
});

server.addHook('onRequest', async (request, reply) => {
  const traceId = randomUUID();
  reply.header('X-Trace-ID', traceId);
  structuredLogger('debug', 'REQ_IN', { method: request.method, url: request.url, traceId });
});

// ----------------------------------------------------
// 1. LISTAR TAREFAS (GET /api/v1/tasks)
// ----------------------------------------------------
server.get('/api/v1/tasks', async (request, reply) => {
    try {
        // Usa a conexão com RLS. A query NÃO precisa de WHERE workspace_id = ...
        // A política do Postgres injeta isso automaticamente!
        const tasks = await executeWithRLS(request.user.workspaceId, async (client) => {
            const res = await client.query(`
                SELECT id, title, status, due_date as "dueDate", version, priority, assignee_id 
                FROM tasks 
                ORDER BY created_at DESC
            `);
            return res.rows;
        });

        // Mapeia assignee_id para nome (Mock simples para visualização)
        const enrichedTasks = tasks.map((t: any) => ({
            ...t,
            assignee: 'DevOps' // Simplificação: Na prática faríamos JOIN com users
        }));

        return reply.send(enrichedTasks);
    } catch (err: any) {
        structuredLogger('error', 'DB_ERROR', { error: err.message });
        return reply.status(500).send({ error: 'Erro ao buscar tarefas' });
    }
});

// ----------------------------------------------------
// 2. ATUALIZAR TAREFA (PUT /api/v1/tasks/:id) - Com Optimistic Locking
// ----------------------------------------------------
interface UpdateBody { title: string; }

server.put<{ Params: { taskId: string }, Body: UpdateBody }>('/api/v1/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params;
    const { title } = request.body;

    // Validação do If-Match
    const ifMatch = request.headers['if-match'];
    if (!ifMatch) return reply.status(400).send({ error: 'Header If-Match obrigatório' });
    const expectedVersion = parseInt(ifMatch as string, 10);

    try {
        const updatedTask = await executeWithRLS(request.user.workspaceId, async (client) => {
            // 1. Verifica versão atual
            const checkRes = await client.query('SELECT version FROM tasks WHERE id = $1', [taskId]);

            if (checkRes.rowCount === 0) {
                const err: any = new Error('Not Found'); err.status = 404; throw err;
            }

            const currentVersion = checkRes.rows[0].version;

            // 2. Lógica de Concorrência
            if (currentVersion !== expectedVersion) {
                const err: any = new Error('Conflict'); err.status = 409; throw err;
            }

            // 3. Atualiza e Incrementa Versão
            const updateRes = await client.query(`
                UPDATE tasks 
                SET title = $1, version = version + 1, updated_at = now()
                WHERE id = $2
                RETURNING id, title, version
            `, [title, taskId]);

            return updateRes.rows[0];
        });

        // Emite evento
        await eventBus.emit('task.updated', { taskId, version: updatedTask.version });

        reply.header('ETag', updatedTask.version.toString());
        return reply.send(updatedTask);

    } catch (err: any) {
        if (err.status === 409) {
            return reply.status(409).send({ code: 'CONFLITO_CONCORRENCIA', message: 'Dados alterados por outro usuário.' });
        }
        if (err.status === 404) return reply.status(404).send({ error: 'Tarefa não encontrada' });

        structuredLogger('error', 'UPDATE_FAIL', { msg: err.message });
        return reply.status(500).send({ error: 'Erro interno' });
    }
});

// ----------------------------------------------------
// 3. Health Check
// ----------------------------------------------------
server.get('/health/ready', async (req, reply) => {
    try {
        await pool.query('SELECT 1'); // Teste real no DB
        return { status: 'ok', db: 'connected' };
    } catch (e) {
        return reply.status(503).send({ status: 'error', db: 'disconnected' });
    }
});

const start = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log(`\n--- Backend Real (Postgres) rodando na porta 3000 ---`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();