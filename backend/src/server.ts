import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';
import { setTimeout } from 'timers/promises';

// --- Mocks de Sistemas Distribuídos ---
// 1. Logging Estruturado (simula Loki/ELK)
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

// 2. Mock de Event Bus (Kafka/BullMQ)
const eventBus = {
  // Na versão sem Docker/Kafka, isso simula a emissão para o Redis/BullMQ
  emit: async (topic: string, event: any) => {
    structuredLogger('info', `EVENT_EMITTED_TO_QUEUE`, { topic, eventId: randomUUID(), payload: event });
    // Simulação de latência de escrita na fila de eventos
    await setTimeout(20);
  }
}

// 3. Mock de Banco de Dados (PostgreSQL)
interface Task {
  id: string;
  workspace_id: string;
  title: string;
  version: number; // Campo crucial para concorrência otimista
  updated_at: Date;
}

// Armazenamento em memória para simular o DB (Postgres)
let tasks: Task[] = [
  { id: 't1', workspace_id: 'w1', title: 'Implementar Concorrência Otimista (PUT /tasks/{id})', version: 5, updated_at: new Date() },
  { id: 't2', workspace_id: 'w1', title: 'Configurar RLS no PostgreSQL', version: 3, updated_at: new Date() },
];

const db = {
  // Simula consulta de uma tarefa
  getTask: async (id: string): Promise<Task | undefined> => {
    await setTimeout(50); // Simula latência do RDS
    return tasks.find(t => t.id === id);
  },
  // Simula a transação de atualização com checagem de versão
  updateTask: async (id: string, newTitle: string, expectedVersion: number): Promise<Task> => {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      throw new Error("Task not found");
    }

    const currentTask = tasks[taskIndex];

    // --- Lógica Crítica: Optimistic Locking ---
    if (currentTask.version !== expectedVersion) {
      // Falha na Concorrência: A tarefa foi modificada por outro cliente.
      structuredLogger('warn', 'CONCURRENCY_CONFLICT', { taskId: id, expected: expectedVersion, actual: currentTask.version });
      const conflictError: any = new Error("Conflict: Resource modified");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    // Sucesso: Atualiza a task e incrementa a versão
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
  logger: false // Usamos nosso logger estruturado personalizado
});

// Middleware de Autenticação (simulado)
server.decorateRequest('user', { userId: 'u999', workspaceId: 'w1' });

server.addHook('onRequest', async (request, reply) => {
  // 1. OpenTelemetry: Gera um trace_id para requisições
  const traceId = randomUUID();
  reply.header('X-Trace-ID', traceId);

  // 2. Structured Logging para CADA requisição
  structuredLogger('debug', 'REQUEST_RECEIVED', {
    method: request.method,
    url: request.url,
    traceId
  });
});


// ----------------------------------------------------
// 1. Endpoint de Health Check (K8s: Readiness/Liveness Probe)
// ----------------------------------------------------
server.get('/health/ready', async (request, reply) => {
  // Checagem de dependências vitais (DB, Redis, etc.)
  try {
    // Simulação: checar se o DB e Redis estão acessíveis (Na produção, use uma chamada real)
    // await db.checkConnection();
    return reply.status(200).send({ status: 'ready', dependencies: 'ok' });
  } catch (error: any) {
    structuredLogger('error', 'HEALTH_CHECK_FAILURE', { error: error.message });
    return reply.status(503).send({ status: 'unhealthy', reason: 'DB connection failed' });
  }
});


// ----------------------------------------------------
// 2. Endpoint de Atualização de Tarefas (Optimistic Locking)
//    PUT /api/v1/tasks/:taskId
// ----------------------------------------------------
server.put<{ Params: TaskParams, Body: UpdateTaskBody }>('/api/v1/tasks/:taskId', async (request, reply) => {
  const { taskId } = request.params;
  const { title } = request.body;
  const traceId = reply.getHeader('X-Trace-ID');

  // Extrai a versão esperada do cabeçalho If-Match (Etag)
  const ifMatchHeader = request.headers['if-match'];
  if (!ifMatchHeader) {
    return reply.status(400).send({ code: 'MISSING_VERSION', message: 'If-Match header is required for updates.' });
  }

  const expectedVersion = parseInt(ifMatchHeader as string, 10);
  if (isNaN(expectedVersion)) {
    return reply.status(400).send({ code: 'INVALID_VERSION', message: 'If-Match must contain a valid integer version.' });
  }

  try {
    // 1. Tenta atualizar a task com a versão esperada
    const updatedTask = await db.updateTask(taskId, title, expectedVersion);

    // 2. Emite o evento assíncrono para notificação/sincronização
    await eventBus.emit('task.events', {
      type: 'task.updated',
      task: { id: updatedTask.id, version: updatedTask.version },
      userId: request.user.userId
    });

    // 3. Retorna 200 OK com o novo ETag/Version
    reply.header('ETag', updatedTask.version.toString());
    structuredLogger('info', 'TASK_UPDATE_SUCCESS', { taskId, newVersion: updatedTask.version, traceId });

    return updatedTask;

  } catch (error: any) {
    // 4. Trata Conflito de Concorrência
    if (error.statusCode === 409) {
      return reply.status(409).send({
        code: 'CONCURRENCY_FAILURE',
        message: 'A tarefa foi modificada. Recarregue e tente novamente.',
        traceId
      });
    }

    // 5. Trata Erros Genéricos
    structuredLogger('error', 'TASK_UPDATE_ERROR', { error: error.message, traceId });
    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno no processamento.',
      traceId
    });
  }
});

// ----------------------------------------------------
// 3. Endpoint de Listagem (Simulação de Filtro GIN/Full-text Search)
// ----------------------------------------------------
server.get('/api/v1/tasks', async (request, reply) => {
    // Simula query com filtros (query, page, size) - RLS seria aplicado na query real
    const query = (request.query as any).query || '';
    const filtered = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));

    // Observação: Na produção, esta rota poderia bater em uma Read Replica ou um índice ElasticSearch
    return reply.status(200).send(filtered);
});


const start = async () => {
  try {
    const port = 3000;
    await server.listen({ port });
    console.log(`\n--- ArcaneTasks Backend iniciado na porta ${port} ---`);
    console.log(`Tasks iniciais no DB: ${tasks.map(t => t.id).join(', ')}`);
    console.log(`Liveness/Readiness: http://localhost:${port}/health/ready`);
    console.log(`Exemplo PUT (v1, falha esperada): curl -X PUT http://localhost:${port}/api/v1/tasks/t1 -H "If-Match: 1" -H "Content-Type: application/json" -d '{"title": "Novo Título"}'`);
    console.log(`Exemplo PUT (v4, sucesso): curl -X PUT http://localhost:${port}/api/v1/tasks/t2 -H "If-Match: 3" -H "Content-Type: application/json" -d '{"title": "Task V4"}'`);
  } catch (err) {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
};

start();