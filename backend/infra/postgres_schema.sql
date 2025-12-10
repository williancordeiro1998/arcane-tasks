-- ===============================================
-- SCHEMA DE DADOS ARCANE TASKS (PostgreSQL)
-- Foco em RLS e concorrência otimista
-- ===============================================

-- 0. LIMPEZA (RESET)
-- Remove tabelas antigas para permitir re-execução do script sem erros
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. EXTENSÕES NECESSÁRIAS
-- Cria extensão UUID para chaves primárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS DE AUTORIZAÇÃO E CONTEXTO

-- Organizações (Multi-Tenant Root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Usuários (RBAC)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- Na produção, seria um hash
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- user, admin, org-admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workspaces (Pertencem a uma Organização)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABELA PRINCIPAL DE TAREFAS (COM CAMPO DE CONCORRÊNCIA)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'A Fazer',
  assignee_id UUID REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1, -- CHAVE PARA OPTIMISTIC LOCKING
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'Medium', -- Coluna essencial
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice GIN para Busca Full-Text rápida
CREATE INDEX tasks_search_idx ON tasks USING GIN (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description,'')));

-- 4. CONFIGURAÇÃO DE ROW-LEVEL SECURITY (RLS)

-- Habilitar RLS na tabela de tarefas
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy de acesso: Permite que usuários leiam e escrevam SOMENTE nas tarefas
-- que pertencem ao seu workspace_id.
CREATE POLICY workspace_isolation ON tasks
FOR ALL
USING (
    -- Simula a verificação de que o workspace_id da tarefa
    -- corresponde ao ID do workspace que o usuário está acessando.
    workspace_id = current_setting('app.current_workspace_id', TRUE)::UUID
)
WITH CHECK (
    workspace_id = current_setting('app.current_workspace_id', TRUE)::UUID
);

-- 5. DADOS INICIAIS (MOCK)

INSERT INTO organizations (name) VALUES ('ArcaneCorp') RETURNING id;

-- Inserção de Workspaces e Usuários
INSERT INTO workspaces (id, org_id, name) VALUES (
    '1c3b9f4a-7d2e-4c5a-8b1e-0a5d4c3f2b1a',
    (SELECT id FROM organizations WHERE name = 'ArcaneCorp'),
    'Desenvolvimento Principal'
);

INSERT INTO users (id, email, name) VALUES (
    '99999999-9999-49c0-9eda-3e26b08d3fe6',
    'willian.c@arcane.com',
    'Willian Cordeiro'
);

-- Inserir as tarefas iniciais
INSERT INTO tasks (title, workspace_id, status, assignee_id, due_date, version, priority) VALUES
('Implementar Concorrência Otimista (PUT /tasks/{id})', '1c3b9f4a-7d2e-4c5a-8b1e-0a5d4c3f2b1a', 'Em Progresso', '99999999-9999-49c0-9eda-3e26b08d3fe6', '2027-08-20', 5, 'High'),
('Configurar RLS no PostgreSQL', '1c3b9f4a-7d2e-4c5a-8b1e-0a5d4c3f2b1a', 'Concluído', '99999999-9999-49c0-9eda-3e26b08d3fe6', '2027-01-10', 2, 'Medium'),
('Criar Dashboard Grafana de Latência p95', '1c3b9f4a-7d2e-4c5a-8b1e-0a5d4c3f2b1a', 'A Fazer', '99999999-9999-49c0-9eda-3e26b08d3fe6', '2027-05-15', 1, 'High');