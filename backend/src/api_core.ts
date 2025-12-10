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

// --- CONEXÃO COM A BASE DE DADOS (DEPLOY READY) ---
const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false }
    }
  : {
      user: 'postgres',
      host: 'localhost',
      database: 'arcanedb',
      password: '1490',
      port: 5432,
      ssl: false
    };

const pool = new Pool(poolConfig);

// Helper para executar transações com contexto de segurança (RLS)
const executeWithRLS = async (workspaceId: string, operation: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
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

// --- MOCK DE EVENT BUS ---
const eventBus = {
  emit: async (topic: string, event: any) => {
    structuredLogger('info', `EVENTO_EMITIDO`, { topic, eventId: randomUUID(), payload: event });
  }
}

// --- SERVIDOR FASTIFY ---
const server: FastifyInstance = Fastify({ logger: false });

server.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "If-Match", "Authorization"],
  exposedHeaders: ["ETag"]
});

server.decorateRequest('user', {
    getter: () => ({
        userId: '99999999-9999-49c0-9eda-3e26b08d3fe6',
        workspaceId: '1c3b9f4a-7d2e-4c5a-8b1e-0a5d4c3f2b1a'
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
        const tasks = await executeWithRLS(request.user.workspaceId, async (client) => {
            const res = await client.query(`
                SELECT id, title, status, due_date as "dueDate", version, priority, assignee_id 
                FROM tasks 
                ORDER BY created_at DESC
            `);
            return res.rows;
        });

        const enrichedTasks = tasks.map((t: any) => ({
            ...t,
            assignee: 'DevOps'
        }));

        return reply.send(enrichedTasks);
    } catch (err: any) {
        structuredLogger('error', 'DB_ERROR', { error: err.message });
        return reply.status(500).send({ error: 'Erro ao buscar tarefas' });
    }
});

// ----------------------------------------------------
// 2. CRIAR TAREFA (POST /api/v1/tasks) - NOVO!
// ----------------------------------------------------
interface CreateBody { title: string; status?: string; priority?: string; dueDate?: string; }

server.post<{ Body: CreateBody }>('/api/v1/tasks', async (request, reply) => {
    const { title, status, priority, dueDate } = request.body;

    try {
        const newTask = await executeWithRLS(request.user.workspaceId, async (client) => {
            // Insere usando SQL real e retorna o objeto criado
            const res = await client.query(`
                INSERT INTO tasks (
                    title, status, priority, due_date, 
                    workspace_id, assignee_id, version, created_at, updated_at
                )
                VALUES (
                    $1, $2, $3, $4, 
                    $5, $6, 1, now(), now()
                )
                RETURNING id, title, status, due_date as "dueDate", version, priority, assignee_id
            `, [
                title,
                status || 'A Fazer',
                priority || 'Medium',
                dueDate || new Date().toISOString(), // Fallback para data atual se não enviada
                request.user.workspaceId,
                request.user.userId
            ]);
            return res.rows[0];
        });

        await eventBus.emit('task.created', { taskId: newTask.id });

        // Retorna 201 Created com a tarefa nova
        return reply.status(201).send(newTask);

    } catch (err: any) {
        structuredLogger('error', 'CREATE_FAIL', { msg: err.message });
        return reply.status(500).send({ error: 'Erro ao criar tarefa' });
    }
});

// ----------------------------------------------------
// 3. ATUALIZAR TAREFA (PUT /api/v1/tasks/:id)
// ----------------------------------------------------
interface UpdateBody { title: string; }

server.put<{ Params: { taskId: string }, Body: UpdateBody }>('/api/v1/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params;
    const { title } = request.body;

    const ifMatch = request.headers['if-match'];
    if (!ifMatch) return reply.status(400).send({ error: 'Header If-Match obrigatório' });
    const expectedVersion = parseInt(ifMatch as string, 10);

    try {
        const updatedTask = await executeWithRLS(request.user.workspaceId, async (client) => {
            const checkRes = await client.query('SELECT version FROM tasks WHERE id = $1', [taskId]);

            if (checkRes.rowCount === 0) {
                const err: any = new Error('Not Found'); err.status = 404; throw err;
            }

            const currentVersion = checkRes.rows[0].version;

            if (currentVersion !== expectedVersion) {
                const err: any = new Error('Conflict'); err.status = 409; throw err;
            }

            const updateRes = await client.query(`
                UPDATE tasks 
                SET title = $1, version = version + 1, updated_at = now()
                WHERE id = $2
                RETURNING id, title, version
            `, [title, taskId]);

            return updateRes.rows[0];
        });

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
// 4. Health Check
// ----------------------------------------------------
server.get('/health/ready', async (req, reply) => {
    try {
        await pool.query('SELECT 1');
        return { status: 'ok', db: 'connected' };
    } catch (e) {
        return reply.status(503).send({ status: 'error', db: 'disconnected' });
    }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await server.listen({ port: port, host: '0.0.0.0' });
    console.log(`\n--- Backend Real (Postgres) rodando na porta ${port} ---`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();