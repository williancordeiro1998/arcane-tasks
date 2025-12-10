import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';

/**
 * ArcaneTasksApp.jsx
 * Arquivo único com frontend React (sem dependências específicas de Next)
 * - Integração REAL com Backend via axios.post na criação de tarefas
 * - i18n embutido
 * - Correção do flickering/loop de renderização no polling (useRef)
 * - Persistência de Sessão (LocalStorage) implementada
 */

/* ---------------------------
   Utilitários
   --------------------------- */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) return self.crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1/tasks';
const SESSION_KEY = 'arcane_session_v1'; // Chave para o localStorage

/* ---------------------------
   Mock tasks (Fallback)
   --------------------------- */
const MOCK_TASKS = [
  { id: 1, title: "Implementar Concorrência Otimista (PUT /tasks/{id})", status: "Em Progresso", assignee: "DevOps", dueDate: "2027-08-20", version: 5, priority: 'High' },
  { id: 2, title: "Configurar RLS no PostgreSQL", status: "Concluído", assignee: "Security", dueDate: "2027-01-10", version: 2, priority: 'Medium' },
  { id: 3, title: "Criar Dashboard Grafana de Latência p95", status: "A Fazer", assignee: "Infra", dueDate: "2027-05-15", version: 1, priority: 'High' },
  { id: 4, title: "Revisar Pipeline E2E Playwright", status: "Em Progresso", assignee: "QA", dueDate: "2027-09-01", version: 3, priority: 'Medium' },
];

/* ---------------------------
   Translations (i18n)
   --------------------------- */
const translations = {
  pt: {
    appTitle: "ArcaneTasks",
    appSubtitle: "Plataforma Colaborativa Completa",
    loginButton: "Entrar",
    loginFail: "Falha na autenticação simulada.",
    logout: "Sair",
    menuDashboard: "Dashboard",
    menuTasks: "Tarefas",
    menuMembers: "Membros",
    menuSettings: "Configurações",
    menuMetrics: "Monitoramento (Métricas)",
    statusTodo: "A Fazer",
    statusInProgress: "Em Progresso",
    statusDone: "Concluído",
    statusMapping: {
      "A Fazer": "A Fazer",
      "Em Progresso": "Em Progresso",
      "Concluído": "Concluído",
    },
    taskTitles: {
      "Implementar Concorrência Otimista (PUT /tasks/{id})": "Implementar Concorrência Otimista (PUT /tasks/{id})",
      "Configurar RLS no PostgreSQL": "Configurar RLS no PostgreSQL",
      "Criar Dashboard Grafana de Latência p95": "Criar Dashboard Grafana de Latência p95",
      "Revisar Pipeline E2E Playwright": "Revisar Pipeline E2E Playwright",
      "Tarefa Atualizada V6": "Tarefa Atualizada V6",
      "Nova Tarefa Criada": "Nova Tarefa de Teste (Criada Agora)",
    },
    responsible: "Responsável",
    dueDate: "Prazo",
    versionLocking: "Versão (Lógica)",
    realTimeUpdate: "Atualização Real-Time",
    viewDetails: "Ver Detalhes",
    taskDetails: "Detalhes da Tarefa",
    detailsAssignedTo: "Atribuído a",
    detailsStatus: "Status Atual",
    detailsVersion: "Versão de Concorrência",
    detailsCreated: "Criada em",
    workspaceTitle: "Workspace Principal",
    sessionID: "Bem-vindo! Seu ID de Sessão:",
    newTask: "Nova Tarefa",
    searchPlaceholder: "Buscar Tarefas (Full-text search)",
    filterStatus: "Filtrar por Status",
    filterDueDate: "Prazo",
    priorityHigh: "Prioridade (Alta)",
    filterSort: "Ordenar por",
    noTasksFound: "Nenhuma tarefa encontrada.",
    loadingData: "Carregando tarefas do backend...",
    restoringSession: "Restaurando sessão...",
    summaryTasks: "Tarefas Ativas/Total",
    summaryUsers: "Membros do Workspace",
    summaryProgress: "Progresso da Sprint",
    roleAdmin: "Admin",
    roleUser: "Usuário",
    memberStatus: "Status",
    lastLogin: "Último Login",
    memberRole: "Função (RBAC)",
    settingsTitle: "Configurações do Workspace",
    settingsRLS: "Status RLS (Row-Level Security)",
    settingsRLSDesc: "Garante isolamento total entre os workspaces no PostgreSQL.",
    settingsConcurrency: "Concorrência Otimista",
    settingsConcurrencyDesc: "Ativo. Requer o header If-Match para todas as operações PUT.",
    settingsEvents: "Barramento de Eventos (Kafka/BullMQ)",
    settingsEventsDesc: "Eventos emitidos para BullMQ para processamento assíncrono.",
    settingsDryRun: "Dry-run Mode (Deletions)",
    settingsDryRunDesc: "Recurso desativado: deleção permanente imediata.",
    settingsFlags: "Feature Flags",
    settingsFlagsDesc: "Sistema de flags (LaunchDarkly mock) em uso para rollout gradual.",
    settingsStatusOn: "ATIVO e Funcional",
    settingsStatusOff: "Desativado ou Inativo",
    metricsTitle: "Monitoramento de Serviço (Prometheus/Grafana)",
    metricsLogBase: "Dados extraídos de Prometheus/Grafana (Mock). Status RTO: OK.",
    metricsLatency: "Latência p95 da API (SLO < 200ms)",
    metricsQueue: "Backlog da Fila de Workers (BullMQ)",
    metricsErrors: "Taxa de Erros no Backend",
    metricsLatencyGraph: "Gráfico de Latência P95 (Simulação)",
    metricsOk: "Meta Atingida",
    metricsHigh: "Acima da Meta",
    minutesAgo: "min atrás",
    justNow: "Agora",
    tasksInProgress: "tarefas em progresso.",
    newMemberAssignee: "Novo Membro",
    notificationTitle: "Atualização em Tempo Real",
    notificationBody: (title) => `Tarefa "${title}" foi atualizada pelo Worker.`,
    filterPriorityHigh: "Alta",
    filterPriorityMedium: "Média",
    filterPriorityLow: "Baixa",
    sortByDate: "Prazo",
    sortByPriority: "Prioridade",
    sortByVersion: "Versão",
    loggedOut: "Você saiu com sucesso.",
    errorLoading: "Erro ao carregar dados.",
  },
  en: {
    appTitle: "ArcaneTasks",
    appSubtitle: "Complete Collaborative Platform",
    loginButton: "Login",
    loginFail: "Simulated authentication failed.",
    logout: "Logout",
    menuDashboard: "Dashboard",
    menuTasks: "Tasks",
    menuMembers: "Members",
    menuSettings: "Settings",
    menuMetrics: "Monitoring (Metrics)",
    statusTodo: "To Do",
    statusInProgress: "In Progress",
    statusDone: "Done",
    statusMapping: {
      "A Fazer": "To Do",
      "Em Progresso": "In Progress",
      "Concluído": "Done",
    },
    taskTitles: {
      "Implementar Concorrência Otimista (PUT /tasks/{id})": "Implement Optimistic Concurrency (PUT /tasks/{id})",
      "Configurar RLS no PostgreSQL": "Configure RLS on PostgreSQL",
      "Criar Dashboard Grafana de Latência p95": "Create Grafana p95 Latency Dashboard",
      "Revisar Pipeline E2E Playwright": "Review Playwright E2E Pipeline",
      "Tarefa Atualizada V6": "Updated Task V6",
      "Nova Tarefa Criada": "New Test Task (Created Now)",
    },
    responsible: "Assignee",
    dueDate: "Due Date",
    versionLocking: "Concurrency Version",
    realTimeUpdate: "Real-Time Update",
    viewDetails: "View Details",
    taskDetails: "Task Details",
    detailsAssignedTo: "Assigned to",
    detailsStatus: "Current Status",
    detailsVersion: "Concurrency Version",
    detailsCreated: "Created on",
    workspaceTitle: "Main Workspace",
    sessionID: "Welcome! Your Session ID:",
    newTask: "New Task",
    searchPlaceholder: "Search Tasks (Full-text search)",
    filterStatus: "Filter by Status",
    filterDueDate: "Due Date",
    priorityHigh: "High Priority",
    filterSort: "Sort by",
    noTasksFound: "No tasks found.",
    loadingData: "Loading tasks from backend...",
    restoringSession: "Restoring session...",
    summaryTasks: "Active Tasks/Total",
    summaryUsers: "Workspace Members",
    summaryProgress: "Sprint Progress",
    roleAdmin: "Admin",
    roleUser: "User",
    memberStatus: "Status",
    lastLogin: "Last Login",
    memberRole: "Role (RBAC)",
    settingsTitle: "Workspace Settings",
    settingsRLS: "RLS Status (Row-Level Security)",
    settingsRLSDesc: "Ensures total isolation between workspaces in PostgreSQL.",
    settingsConcurrency: "Optimistic Concurrency",
    settingsConcurrencyDesc: "Active. Requires the If-Match header for all PUT operations.",
    settingsEvents: "Event Bus (Kafka/BullMQ)",
    settingsEventsDesc: "Events emitted to BullMQ for asynchronous processing.",
    settingsDryRun: "Dry-run Mode (Deletions)",
    settingsDryRunDesc: "Feature deactivated: immediate permanent deletion.",
    settingsFlags: "Feature Flags",
    settingsFlagsDesc: "Flag system (LaunchDarkly mock) in use for gradual rollout.",
    settingsStatusOn: "ACTIVE and Functional",
    settingsStatusOff: "Disabled or Inactive",
    metricsTitle: "Service Monitoring (Prometheus/Grafana)",
    metricsLogBase: "Data extracted from Prometheus/Grafana (Mock). RTO Status: OK.",
    metricsLatency: "API p95 Latency (SLO < 200ms)",
    metricsQueue: "Worker Queue Backlog (BullMQ)",
    metricsErrors: "Backend Error Rate",
    metricsLatencyGraph: "P95 Latency Graph (Simulation)",
    metricsOk: "Target Met",
    metricsHigh: "Above Target",
    minutesAgo: "min ago",
    justNow: "Just now",
    tasksInProgress: "tasks in progress.",
    newMemberAssignee: "New Member",
    notificationTitle: "Real-Time Update",
    notificationBody: (title) => `Task "${title}" was updated by the Worker.`,
    filterPriorityHigh: "High",
    filterPriorityMedium: "Medium",
    filterPriorityLow: "Low",
    sortByDate: "Due Date",
    sortByPriority: "Priority",
    sortByVersion: "Version",
    loggedOut: "You have logged out.",
    errorLoading: "Error loading data.",
  }
};

/* ---------------------------
   IconMap & Neon styles
   --------------------------- */
const IconMap = {
  Dashboard: '🔮', Tasks: '📜', Members: '👁️‍🗨️', Settings: '✨', Metrics: '📊',
  Logout: '🌌', Search: '🔍', NewTask: '⭐', StatusTodo: '🌑', StatusInProgress: '🌓',
  StatusDone: '🌕', RealTime: '🌀', Loading: '💫',
};

const neonStyleInline = { color: '#a5b4fc', textShadow: '0 0 5px #4f46e5, 0 0 10px #a5b4fc' };
const neonTextClass = "text-indigo-400 font-semibold";

/* ---------------------------
   NotificationToast component
   --------------------------- */
const NotificationToast = ({ message, type = 'info', onClose }) => {
  if (!message) return null;
  const colors = { info: 'bg-indigo-600', success: 'bg-green-600', error: 'bg-red-600' };
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white ${colors[type]}`} role="status">
      <div className="flex items-center">
        <span className="text-xl mr-3">🔔</span>
        <div>
          <p className="font-bold">{message.title}</p>
          <p className="text-sm">{message.body}</p>
        </div>
        <button onClick={onClose} className="ml-4 font-bold text-lg" aria-label="close-notification">&times;</button>
      </div>
    </div>
  );
};

/* ---------------------------
   TaskDetailModal
   --------------------------- */
const TaskDetailModal = ({ task, t, onClose }) => {
  if (!task) return null;
  const statusText = t.statusMapping[task.status] || task.status;
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-900 text-xl font-bold">&times;</button>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">{t.taskDetails}</h2>
        <p className="text-lg font-semibold text-gray-800 mb-4">{t.taskTitles[task.title] || task.title}</p>
        <div className="space-y-3 text-sm">
          <p className="flex justify-between border-b pb-1"><strong className="text-gray-600">{t.detailsAssignedTo}:</strong><span className="font-medium text-indigo-600">{task.assignee}</span></p>
          <p className="flex justify-between border-b pb-1"><strong className="text-gray-600">{t.detailsStatus}:</strong><span className={`font-medium ${task.status === 'Concluído' ? 'text-green-600' : 'text-yellow-600'}`}>{statusText}</span></p>
          <p className="flex justify-between border-b pb-1"><strong className="text-gray-600">{t.dueDate}:</strong><span className="font-medium text-gray-800">{task.dueDate}</span></p>
          <p className="flex justify-between"><strong className="text-gray-600">{t.detailsVersion}:</strong><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">V{task.version}</span></p>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------
   DashboardSummary
   --------------------------- */
const DashboardSummary = ({ tasks, t }) => {
  const activeTasks = (Array.isArray(tasks) ? tasks.filter(x => x.status !== 'Concluído') : []).length;
  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 md:p-8">
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
        <p className="text-sm font-medium text-gray-500">{t.summaryTasks}</p>
        <h2 className="text-3xl font-extrabold text-gray-900 mt-1">{activeTasks}/{totalTasks}</h2>
        <p className="text-xs text-indigo-500 mt-2 flex items-center"><span className="mr-1">📜</span>Mais {activeTasks} {t.tasksInProgress}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-teal-500">
        <p className="text-sm font-medium text-gray-500">{t.summaryUsers}</p>
        <h2 className="text-3xl font-extrabold text-gray-900 mt-1">5</h2>
        <p className="text-xs text-teal-500 mt-2 flex items-center"><span className="mr-1">👁️‍🗨️</span>{t.roleAdmin}: 1, {t.roleUser}: 4</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
        <p className="text-sm font-medium text-gray-500">{t.summaryProgress}</p>
        <h2 className="text-3xl font-extrabold text-gray-900 mt-1">42%</h2>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: '42%' }} /></div>
      </div>
    </div>
  );
};

/* ---------------------------
   MembersView
   --------------------------- */
const MembersView = ({ t }) => {
  const getLoginStatusText = (time) => {
    if (typeof time === 'string' && time.includes('min ago')) {
      return `${parseInt(time)} ${t.minutesAgo || 'min ago'}`;
    }
    return time;
  };
  const members = [
    { name: "Willian Cordeiro (Admin)", email: "willian.c@arcane.com", role: t.roleAdmin, status: 'Online', lastLogin: t.justNow },
    { name: "Jane Doe", email: "jane@arcane.com", role: t.roleUser, status: 'Offline', lastLogin: `15 min ago` },
    { name: "João Silva", email: "joao@arcane.com", role: t.roleUser, status: 'Online', lastLogin: t.justNow },
  ];
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{t.menuMembers}</h1>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.memberRole}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.memberStatus}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.lastLogin}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map(member => (
              <tr key={member.email} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.role === t.roleAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>{member.role}</span></td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{member.status}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.lastLogin === t.justNow ? t.justNow : getLoginStatusText(member.lastLogin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ---------------------------
   SettingsView
   --------------------------- */
const SettingsView = ({ t, neonStyle }) => {
  const features = [
    { name: t.settingsRLS, status: t.settingsStatusOn, icon: '🔒', color: 'text-green-500', desc: t.settingsRLSDesc },
    { name: t.settingsConcurrency, status: t.settingsStatusOn, icon: '⚔️', color: 'text-green-500', desc: t.settingsConcurrencyDesc },
    { name: t.settingsEvents, status: t.settingsStatusOn, icon: '🔗', color: 'text-green-500', desc: t.settingsEventsDesc },
    { name: t.settingsDryRun, status: t.settingsStatusOff, icon: '🧪', color: 'text-red-500', desc: t.settingsDryRunDesc },
    { name: t.settingsFlags, status: t.settingsStatusOn, icon: '🚩', color: 'text-green-500', desc: t.settingsFlagsDesc },
  ];
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{t.settingsTitle}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-400 hover:shadow-xl transition-all">
            <div className="flex justify-between items-center">
              <span className={`text-3xl ${feature.color}`}>{feature.icon}</span>
              <span className={`text-sm font-semibold ${feature.status === t.settingsStatusOn ? 'text-green-600' : 'text-red-600'}`}>{feature.status}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-3">{feature.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------------------------
   MetricsView
   --------------------------- */
const MetricsView = ({ t, neonStyle }) => {
  const metricsData = [
    { name: t.metricsLatency, value: "185ms", target: "200ms", status: 'ok', icon: '🚀' },
    { name: t.metricsQueue, value: "2/1000", target: "100", status: 'ok', icon: '📈' },
    { name: t.metricsErrors, value: "1.5%", target: "1%", status: 'high', icon: '🚨' },
  ];
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{t.metricsTitle}</h1>
      <p className="text-sm text-gray-600 mb-6 flex items-center"><span className="text-lg mr-2" style={neonStyle}>{IconMap.Metrics}</span>{t.metricsLogBase}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricsData.map((metric, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-gray-400">
            <div className="flex justify-between items-center">
              <span className="text-3xl">{metric.icon}</span>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${metric.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{metric.status === 'ok' ? t.metricsOk : t.metricsHigh}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-3">{metric.value}</h2>
            <p className="text-sm text-gray-500 mt-1">{metric.name}</p>
            <p className="text-xs text-gray-400 mt-2">Target: {metric.target}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-3">{t.metricsLatencyGraph}</h3>
        <div className="h-40 bg-gray-100 p-2 rounded relative">
          <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-red-500 border-dashed border-t-2">
            <span className="absolute -top-3 right-0 text-xs text-red-500 bg-white px-1">200ms (SLO)</span>
          </div>
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline fill="none" stroke="#4f46e5" strokeWidth="1" points="0,80 15,70 30,75 45,60 60,70 75,50 90,65 100,55" />
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------
   Sidebar
   --------------------------- */
const Sidebar = ({ currentView, setView, lang, setLang, t, onLogout }) => {
  const navItems = [
    { name: t.menuDashboard, iconKey: 'Dashboard', view: 'dashboard' },
    { name: t.menuTasks, iconKey: 'Tasks', view: 'tasks' },
    { name: t.menuMembers, iconKey: 'Members', view: 'members' },
    { name: t.menuSettings, iconKey: 'Settings', view: 'settings' },
    { name: t.menuMetrics, iconKey: 'Metrics', view: 'metrics' },
  ];
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 p-4 w-64 md:w-56 flex-shrink-0">
      <div className={`text-xl font-bold tracking-wider mb-2 ${neonTextClass}`}>{t.appTitle}</div>
      <div className="mb-6 p-2 bg-gray-800 rounded-lg flex items-center justify-between border border-gray-700">
        <span className="text-xl mr-2" style={neonStyleInline}>🌐</span>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-gray-800 text-sm text-white focus:ring-0 focus:border-0 border-none w-full cursor-pointer">
          <option value="pt">Português (PT)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>
      <nav className="flex-grow space-y-2">
        {navItems.map(item => (
          <button key={item.name} onClick={() => setView(item.view)} className={`flex items-center w-full p-2 rounded-lg transition-colors duration-200 ${currentView === item.view ? 'bg-indigo-700 text-white font-semibold shadow-xl shadow-indigo-900/50' : 'text-gray-300 hover:bg-gray-700'}`}>
            <span className="text-lg w-5 h-5 mr-3 flex items-center justify-center" style={neonStyleInline}>{IconMap[item.iconKey]}</span>
            <span className="text-sm">{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="pt-4 border-t border-gray-700">
        <button onClick={onLogout} className="flex items-center w-full p-2 text-red-400 hover:bg-gray-700 rounded-lg transition-colors duration-200">
          <span className="text-lg w-5 h-5 mr-3 flex items-center justify-center" style={neonStyleInline}>{IconMap.Logout}</span>
          <span className="text-sm">{t.logout}</span>
        </button>
      </div>
    </div>
  );
};

/* ---------------------------
   TaskCard
   --------------------------- */
const TaskCard = ({ task, t, onDetailsClick }) => {
  const statusText = t.statusMapping[task.status] || task.status;
  const iconKey = useMemo(() => {
    if (statusText === t.statusTodo || task.status === 'A Fazer') return 'StatusTodo';
    if (statusText === t.statusInProgress || task.status === 'Em Progresso') return 'StatusInProgress';
    if (statusText === t.statusDone || task.status === 'Concluído') return 'StatusDone';
    return 'StatusTodo';
  }, [statusText, t.statusTodo, t.statusInProgress, t.statusDone, task.status]);

  const statusColors = useMemo(() => ({
    [t.statusTodo]: { bg: 'bg-gray-200 text-gray-800', icon: IconMap.StatusTodo },
    [t.statusInProgress]: { bg: 'bg-yellow-100 text-yellow-800', icon: IconMap.StatusInProgress, iconClass: 'animate-spin' },
    [t.statusDone]: { bg: 'bg-green-100 text-green-800', icon: IconMap.StatusDone },
  }), [t.statusTodo, t.statusInProgress, t.statusDone]);

  const { bg, text, iconClass = '' } = statusColors[statusText] || {};
  const priorityColor = task.priority === 'High' ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-indigo-500">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800 break-words line-clamp-2">{t.taskTitles[task.title] || task.title}</h3>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${bg} ${text} flex items-center ml-4 flex-shrink-0`}>
          <span className={`w-4 h-4 mr-1 text-sm flex items-center justify-center ${iconClass}`}>{IconMap[iconKey]}</span>
          {statusText}
        </span>
      </div>
      <div className="space-y-1 text-sm text-gray-500">
        <p><strong>{t.responsible}:</strong> {task.assignee}</p>
        <p><strong>{t.dueDate}:</strong> <span className={priorityColor}>{task.dueDate}</span></p>
        <p><strong>{t.versionLocking}:</strong> V{task.version}</p>
        <p className={`flex items-center text-xs mt-2 ${neonTextClass}`}><span className="text-base mr-1" style={neonStyleInline}>{IconMap.RealTime}</span>{t.realTimeUpdate}</p>
      </div>
      <button onClick={() => onDetailsClick(task)} className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/50">{t.viewDetails}</button>
    </div>
  );
};

/* ---------------------------
   MainDashboard (com filtros/ordenacao)
   --------------------------- */
const MainDashboard = ({ tasks, userId, t, setTasks, onNotify }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortKey, setSortKey] = useState('dueDate');

  const filteredTasks = useMemo(() => {
    let filtered = Array.isArray(tasks) ? tasks.slice() : [];

    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        (task.title || '').toLowerCase().includes(low) || (task.assignee || '').toLowerCase().includes(low)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(task => {
        if (!task.priority) return false;
        return task.priority.toLowerCase() === priorityFilter;
      });
    }

    filtered.sort((a, b) => {
      if (sortKey === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate);
      if (sortKey === 'priority') {
        const order = { High: 3, Medium: 2, Low: 1 };
        return (order[b.priority] || 0) - (order[a.priority] || 0);
      }
      if (sortKey === 'version') return (b.version || 0) - (a.version || 0);
      return 0;
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, sortKey]);

  const truncatedUserId = userId ? `${userId.substring(0, 8)}...` : '';

  // ------------------------------------------------------------------
  //  MODIFICADO: Função para CRIAR tarefa via API REAL
  // ------------------------------------------------------------------
  const handleCreateTask = async () => {
    const newTaskTitle = t.taskTitles["Nova Tarefa Criada"] || t.newTask;
    // O ID é gerado pelo servidor, não precisamos enviar (a menos que o backend exija)

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);

    const payload = {
        title: newTaskTitle,
        status: 'A Fazer',
        assignee: t.newMemberAssignee || 'Novo Membro',
        dueDate: futureDate.toISOString().slice(0, 10),
        version: 1,
        priority: 'High'
    };

    try {
        // Chamada real ao Backend
        const response = await axios.post(BACKEND_URL, payload);
        const savedTask = response.data;

        // Atualiza estado com o retorno do servidor (incluindo ID real)
        setTasks(prev => [savedTask, ...(Array.isArray(prev) ? prev : [])]);

        if (onNotify) onNotify({ title: 'Sucesso', body: 'Tarefa salva no banco de dados!', type: 'success' });

    } catch (error) {
        console.error("Erro ao salvar tarefa no backend:", error);
        if (onNotify) onNotify({ title: 'Erro', body: 'Falha ao salvar a tarefa no backend.', type: 'error' });
    }
  };

  return (
    <div className="flex-grow p-4 md:p-8 overflow-y-auto">
      {selectedTask && <TaskDetailModal task={selectedTask} t={t} onClose={() => setSelectedTask(null)} />}
      <header className="mb-8 border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{t.workspaceTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.sessionID} <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{truncatedUserId}</span></p>
        </div>
        <button onClick={handleCreateTask} className="mt-4 md:mt-0 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-lg shadow-indigo-500/50 hover:bg-indigo-700 transition-transform transform hover:scale-105 flex items-center">
          <span className="text-lg mr-2" style={neonStyleInline}>{IconMap.NewTask}</span>{t.newTask}
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="relative flex-grow">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">{IconMap.Search}</span>
          <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full py-3 pl-12 pr-4 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-md text-gray-900 placeholder-gray-500" />
        </div>

        {/* Filtros + Ordenação */}
        <div className="flex gap-4 flex-wrap justify-end items-center">
          <select className="py-3 px-4 border border-gray-300 rounded-xl shadow-md text-sm bg-gray-100 text-gray-900" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t.filterStatus}</option>
            <option value="A Fazer">{t.statusTodo}</option>
            <option value="Em Progresso">{t.statusInProgress}</option>
            <option value="Concluído">{t.statusDone}</option>
          </select>

          <select className="py-3 px-4 border border-gray-300 rounded-xl shadow-md text-sm bg-gray-100 text-gray-900" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">{t.priorityHigh ? 'Prioridade' : 'Priority'}</option>
            <option value="high">{t.filterPriorityHigh}</option>
            <option value="medium">{t.filterPriorityMedium}</option>
            <option value="low">{t.filterPriorityLow}</option>
          </select>

          <select className="py-3 px-4 border border-gray-300 rounded-xl shadow-md text-sm bg-gray-100 text-gray-900" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="dueDate">{t.sortByDate}</option>
            <option value="priority">{t.sortByPriority}</option>
            <option value="version">{t.sortByVersion}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.isArray(tasks) && tasks.length > 0 ? filteredTasks.map(task => <TaskCard key={task.id} task={task} t={t} onDetailsClick={setSelectedTask} />) : (
          <div className="col-span-full text-center py-10 bg-gray-50 rounded-xl"><p className="text-gray-500">{t.noTasksFound}</p></div>
        )}
      </div>
    </div>
  );
};

/* ---------------------------
   LoginPage
   --------------------------- */
const LoginPage = ({ onLogin, t }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback((e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      if (email === "user@arcane.com" && password === "arcane123") {
        onLogin({ userId: generateUUID() });
      } else {
        alert(t.loginFail);
      }
      setIsLoading(false);
    }, 900);
  }, [email, password, onLogin, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-200">
        <h1 className="text-4xl font-extrabold text-center mb-2 text-gray-900">{t.appTitle}</h1>
        <p className="text-center text-gray-500 mb-8">{t.appSubtitle}</p>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-gray-900 placeholder-gray-500" placeholder="user@arcane.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Senha</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-gray-900 placeholder-gray-500" placeholder="arcane123" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-indigo-500/50 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 disabled:bg-indigo-400">
            {isLoading ? <span className="mr-2 animate-spin" style={neonStyleInline}>{IconMap.Loading}</span> : t.loginButton}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ---------------------------
   Main App (ArcaneTasksApp)
   --------------------------- */
export default function ArcaneTasksApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Estado para checagem inicial

  const [currentView, setCurrentView] = useState('tasks');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState('pt');
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const t = translations[lang] || translations['pt'];

  // ** 1. PERSISTÊNCIA: Restaurar sessão ao montar o componente
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        if (session && session.userId) {
          setUserId(session.userId);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Erro ao restaurar sessão:", e);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsCheckingAuth(false);
  }, []);

  // ** CORREÇÃO DO FLICKERING/LOOP DE POLLING:
  // Usar useRef para manter uma referência ao estado 'tasks'
  const tasksRef = useRef(tasks);
  useEffect(() => {
      tasksRef.current = tasks;
  }, [tasks]);


  const fetchTasks = useCallback(async (opts = { background: false }) => {
    if (!isAuthenticated) return;
    if (!opts.background) setIsLoading(true);
    try {
      const response = await axios.get(BACKEND_URL);
      const remote = Array.isArray(response.data) ? response.data : [];

      setTasks(prev => {
        const localOnly = (Array.isArray(prev) ? prev : []).filter(p => !remote.find(r => r.id === p.id));
        return [...localOnly, ...remote];
      });

      const remoteCount = remote.length;
      const localCount = (Array.isArray(tasksRef.current) ? tasksRef.current.filter(x => typeof x.id === 'number').length : 0);

      if (remoteCount > localCount) {
        setNotification({ title: t.notificationTitle, body: `Recebida(s) ${remoteCount - localCount} nova(s) tarefa(s) via Polling.`, type: 'success' });
      }
    } catch (error) {
      console.error("Erro ao buscar tarefas do backend. Usando mock:", error.message);
      setTasks(prev => {
        const localOnly = (Array.isArray(prev) ? prev : []).filter(p => typeof p.id === 'string');
        return [...localOnly, ...MOCK_TASKS];
      });
    } finally {
      if (!opts.background) setIsLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
      const interval = setInterval(() => fetchTasks({ background: true }), 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchTasks, lang]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ** 2. Login: Salvar no LocalStorage
  const handleLogin = useCallback((userData) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    setUserId(userData.userId);
    setIsAuthenticated(true);
  }, []);

  // ** 3. Logout: Limpar do LocalStorage
  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setUserId(null);
    setTasks(MOCK_TASKS);
    setCurrentView('tasks');
    setNotification(null);
  }, []);

  // Se ainda estiver checando o localStorage, mostra loading
  if (isCheckingAuth) {
    return (<div className="min-h-screen flex items-center justify-center bg-gray-100 p-4"><span className="text-4xl animate-spin" style={neonStyleInline}>{IconMap.Loading}</span><p className="text-gray-700 ml-4">{t.restoringSession || "Restaurando sessão..."}</p></div>);
  }

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} t={t} />;

  if (isLoading) return (<div className="min-h-screen flex items-center justify-center bg-gray-100 p-4"><span className="text-4xl animate-pulse" style={neonStyleInline}>{IconMap.Loading}</span><p className="text-gray-700 ml-4">{t.loadingData}</p></div>);

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-gray-50">
      <NotificationToast message={notification} onClose={() => setNotification(null)} type={notification?.type} />
      <div className="hidden md:flex flex-shrink-0"><Sidebar currentView={currentView} setView={setCurrentView} lang={lang} setLang={setLang} t={t} onLogout={handleLogout} /></div>

      {/* Mobile Header */}
      <header className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center w-full fixed top-0 left-0 z-40">
        <span className={`text-xl font-bold tracking-wider ${neonTextClass}`}>{t.appTitle}</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded hover:bg-gray-700 transition-colors">{isSidebarOpen ? <span className="text-lg" style={neonStyleInline}>{IconMap.Logout}</span> : <span className="text-2xl">☰</span>}</button>
      </header>

      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out w-64"><Sidebar currentView={currentView} setView={(v) => { setCurrentView(v); setIsSidebarOpen(false); }} lang={lang} setLang={setLang} t={t} onLogout={() => { handleLogout(); setIsSidebarOpen(false); }} /></div>
        </>
      )}

      <main className="flex flex-col flex-grow overflow-y-auto pt-16 md:pt-0">
        {currentView === 'dashboard' && <DashboardSummary tasks={tasks} t={t} />}
        {/* Passamos onNotify para que o Dashboard possa criar alertas de sucesso/erro */}
        {currentView === 'tasks' && <MainDashboard tasks={tasks} userId={userId} t={t} setTasks={setTasks} onNotify={setNotification} />}
        {currentView === 'members' && <MembersView t={t} />}
        {currentView === 'settings' && <SettingsView t={t} neonStyle={neonStyleInline} />}
        {currentView === 'metrics' && <MetricsView t={t} neonStyle={neonStyleInline} />}

        {!(currentView === 'tasks' || currentView === 'dashboard' || currentView === 'members' || currentView === 'settings' || currentView === 'metrics') && (
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-2xl font-bold mt-20">View</h2>
            <p>Em construção</p>
          </div>
        )}
      </main>
    </div>
  );
}