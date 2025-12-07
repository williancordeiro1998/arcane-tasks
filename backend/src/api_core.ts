import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors'; // Adicionando importação do CORS
import { randomUUID } from 'crypto';
import { setTimeout } from 'timers/promises';

// --- CORREÇÃO DE ERRO TS2339 / VERMELHO NO IDE ---
// Declarar o módulo Fastify aqui garante que o TypeScript reconheça
// a nova propriedade 'user' adicionada ao objeto request.
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      workspaceId: string;
    };
  }
}

// --- Mocks de Sistemas Distribuídos ---
// 1. Logging Estruturado (simula OpenTelemetry/Loki)
const structuredLogger = (level: string, message: string, data: any = {}) => {
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'ArcaneTasks-API',
    message,
    ...data,
  });
  console.log(logEntry);
};

// 2. Mock de Event Bus (BullMQ/Kafka)
const eventBus = {
  emit: async (topic: string, event: any) => {
    structuredLogger('info', `EVENTO_EMITIDO_PARA_FILA`, { topic, eventId: randomUUID(), payload: event });
    await setTimeout(20);
  }
}

// 3. Mock de Banco de Dados (PostgreSQL)
interface Task {
  id: string;
  workspace_id: string;
  title: string;
  version: number;
  updated_at: Date;
}

// Armazenamento em memória para simular o DB (Postgres)
let tasks: Task[] = [
  { id: 't1', workspace_id: 'w1', title: 'Implementar Concorrência Otimista (PUT /tasks/{id})', version: 5, updated_at: new Date() },
  { id: 't2', workspace_id: 'w1', title: 'Configurar RLS no PostgreSQL', version: 3, updated_at: new Date() },
];

const db = {
  getTaskById: async (id: string): Promise<Task | undefined> => {
      await setTimeout(50);
      return tasks.find(t => t.id === id);
  },
  updateTask: async (id: string, newTitle: string, expectedVersion: number): Promise<Task> => {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      const notFoundError: any = new Error("Tarefa não encontrada");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    const currentTask = tasks[taskIndex];

    // --- Lógica Crítica: Concorrência Otimista (If-Match) ---
    if (currentTask.version !== expectedVersion) {
      structuredLogger('warn', 'CONFLITO_DE_CONCORRENCIA', { taskId: id, expected: expectedVersion, actual: currentTask.version });
      const conflictError: any = new Error("Conflito: Recurso foi modificado por outro usuário.");
      conflictError.statusCode = 409;
      throw conflictError;
    }

    const updatedTask = {
      ...currentTask,
      title: newTitle,
      version: currentTask.version + 1,
      updated_at: new Date(),
    };

    tasks[taskIndex] = updatedTask;
    return updatedTask;
  }
}

// --- Definições de Tipos para Fastify ---
interface UpdateTaskBody {
  title: string;
}
interface TaskParams {
  taskId: string;
}

// --- API Service: Fastify ---
const server: FastifyInstance = Fastify({
  logger: false
});

// ===========================================
// NOVO: Registro do Plugin CORS
// Isso permite que o frontend (localhost:3001) acesse a API (localhost:3000)
// ===========================================
server.register(cors, {
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "If-Match", "Authorization"],
});


// Middleware de Autenticação (simulado)
server.decorateRequest('user', {
    getter: () => ({ userId: 'u999', workspaceId: 'w1' })
});

server.addHook('onRequest', async (request, reply) => {
  const traceId = randomUUID();
  reply.header('X-Trace-ID', traceId);

  structuredLogger('debug', 'REQUISICAO_RECEBIDA', {
    method: request.method,
    url: request.url,
    traceId
  });
});

// ----------------------------------------------------
// 1. Endpoint de Atualização de Tarefas (Optimistic Locking)
// ----------------------------------------------------
server.put<{ Params: TaskParams, Body: UpdateTaskBody }>('/api/v1/tasks/:taskId', async (request, reply) => {
  const { taskId } = request.params;
  const { title } = request.body;
  const traceId = reply.getHeader('X-Trace-ID');

  const ifMatchHeader = request.headers['if-match'];
  if (!ifMatchHeader) {
    return reply.status(400).send({ code: 'VERSAO_FALTANTE', message: 'O cabeçalho If-Match é obrigatório para atualizações.' });
  }

  const expectedVersion = parseInt(ifMatchHeader as string, 10);
  if (isNaN(expectedVersion)) {
    return reply.status(400).send({ code: 'VERSAO_INVALIDA', message: 'If-Match deve conter uma versão inteira válida.' });
  }

  try {
    const updatedTask = await db.updateTask(taskId, title, expectedVersion);

    await eventBus.emit('task.events', {
      type: 'task.updated',
      task: { id: updatedTask.id, version: updatedTask.version },
      userId: request.user.userId
    });

    reply.header('ETag', updatedTask.version.toString());
    structuredLogger('info', 'ATUALIZACAO_SUCESSO', { taskId, newVersion: updatedTask.version, traceId });

    return updatedTask;

  } catch (error: any) {
    if (error.statusCode === 409) {
      return reply.status(409).send({
        code: 'CONFLITO_CONCORRENCIA',
        message: 'A tarefa foi modificada por outro usuário. Recarregue e tente novamente.',
        traceId
      });
    }

    structuredLogger('error', 'ERRO_ATUALIZACAO', { error: error.message, traceId });
    return reply.status(error.statusCode || 500).send({
      code: 'ERRO_INTERNO',
      message: error.message || 'Erro interno no processamento.',
      traceId
    });
  }
});

// ----------------------------------------------------
// 2. Endpoint de Listagem (GET /api/v1/tasks)
// ----------------------------------------------------
server.get('/api/v1/tasks', async (request, reply) => {
    const workspaceTasks = tasks.filter(t => t.workspace_id === request.user.workspaceId);
    return reply.status(200).send(workspaceTasks);
});

// ----------------------------------------------------
// 3. Endpoint de Busca por ID (GET /api/v1/tasks/:taskId)
// ----------------------------------------------------
server.get<{ Params: TaskParams }>('/api/v1/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params;
    const traceId = reply.getHeader('X-Trace-ID');

    const task = await db.getTaskById(taskId);

    if (!task || task.workspace_id !== request.user.workspaceId) {
        structuredLogger('warn', 'TAREFA_NAO_ENCONTRADA_OU_NAO_AUTORIZADA', { taskId, traceId });
        return reply.status(404).send({ code: 'NAO_ENCONTRADO', message: 'Tarefa não encontrada ou acesso negado.', traceId });
    }

    reply.header('ETag', task.version.toString());
    return task;
});


// ----------------------------------------------------
// 4. Endpoint de Health Check (Monitoramento)
// ----------------------------------------------------
server.get('/health/ready', async (request, reply) => {
  try {
    return reply.status(200).send({ status: 'pronto', dependencias: 'ok' });
  } catch (error: any) {
    structuredLogger('error', 'FALHA_HEALTH_CHECK', { error: error.message });
    return reply.status(503).send({ status: 'nao_saudavel', razao: 'Conexão DB falhou' });
  }
});


const start = async () => {
  try {
    const port = 3000;
    await server.listen({ port });
    console.log(`\n--- ArcaneTasks Backend iniciado na porta ${port} ---`);
    console.log(`CORS habilitado para http://localhost:3001.`);
    console.log(`O frontend deve ser acessado em http://localhost:3001.`);
  } catch (err) {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
};

start();