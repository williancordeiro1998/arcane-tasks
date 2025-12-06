import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Ícones lucide-react REMOVIDOS para eliminar dependência externa.
// Usamos Emojis/Unicode + Tailwind para a estética "Arcana Neon".

// --- Dados Mock para Simulação ---
const MOCK_TASKS = [
  { id: 1, title: "Implementar Concorrência Otimista (PUT /tasks/{id})", status: "Em Progresso", assignee: "DevOps", dueDate: "2026-02-15", version: 5, priority: 'High' },
  { id: 2, title: "Configurar RLS no PostgreSQL", status: "Concluído", assignee: "Security", dueDate: "2026-01-20", version: 2, priority: 'Medium' },
  { id: 3, title: "Criar Dashboard Grafana de Latência p95", status: "A Fazer", assignee: "Infra", dueDate: "2027-03-01", version: 1, priority: 'High' },
  { id: 4, title: "Revisar Pipeline E2E Playwright", status: "Em Progresso", assignee: "QA", dueDate: "2026-05-10", version: 3, priority: 'Medium' },
];

// --- Dicionário de Traduções (i18n) ---
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
    // Mapeamento de Status: chave é o valor armazenado no DB, valor é a tradução.
    statusMapping: {
      "A Fazer": "A Fazer",
      "Em Progresso": "Em Progresso",
      "Concluído": "Concluído",
    },
    // TRADUÇÃO DOS TÍTULOS DE TAREFAS (PARA DADOS MOCK HARDCODED)
    taskTitles: {
        "Implementar Concorrência Otimista (PUT /tasks/{id})": "Implementar Concorrência Otimista (PUT /tasks/{id})",
        "Configurar RLS no PostgreSQL": "Configurar RLS no PostgreSQL",
        "Criar Dashboard Grafana de Latência p95": "Criar Dashboard Grafana de Latência p95",
        "Revisar Pipeline E2E Playwright": "Revisar Pipeline E2E Playwright",
    },
    responsible: "Responsável",
    dueDate: "Prazo",
    versionLocking: "Versão (Locking)",
    realTimeUpdate: "Atualização Real-Time",
    viewDetails: "Ver Detalhes",
    workspaceTitle: "Workspace Principal",
    sessionID: "Bem-vindo! Seu ID de Sessão:",
    newTask: "Nova Tarefa",
    searchPlaceholder: "Buscar Tarefas (Full-text search)",
    filterStatus: "Filtrar por Status",
    filterDueDate: "Ordenar por Prazo",
    priorityHigh: "Prioridade (Alta)",
    noTasksFound: "Nenhuma tarefa encontrada.",
    viewBuilding: (view) => `Visão '${view.toUpperCase()}' em Construção`,
    viewFocus: (view) => `Este artefato foca em demonstrar o Login e o Dashboard de Tarefas, a funcionalidade ${view} está no roadmap.`,
    // Textos adicionais para as novas views
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
    settingsConcurrency: "Concorrência Otimista",
    settingsEvents: "Barramento de Eventos (Kafka/BullMQ)",
    settingsStatusOn: "ATIVO e Funcional",
    settingsStatusOff: "Desativado ou Inativo",
    metricsTitle: "Monitoramento de Serviço (Prometheus/Grafana)",
    metricsLatency: "Latência p95 da API (SLO < 200ms)",
    metricsQueue: "Backlog da Fila de Workers (BullMQ)",
    metricsErrors: "Taxa de Erros no Backend",
    metricsOk: "Meta Atingida",
    metricsHigh: "Acima da Meta",
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
    // TRADUÇÃO DOS TÍTULOS DE TAREFAS (PARA DADOS MOCK HARDCODED)
    taskTitles: {
        "Implementar Concorrência Otimista (PUT /tasks/{id})": "Implement Optimistic Concurrency (PUT /tasks/{id})",
        "Configurar RLS no PostgreSQL": "Configure RLS on PostgreSQL",
        "Criar Dashboard Grafana de Latência p95": "Create Grafana p95 Latency Dashboard",
        "Revisar Pipeline E2E Playwright": "Review Playwright E2E Pipeline",
    },
    responsible: "Assignee",
    dueDate: "Due Date",
    versionLocking: "Version (Locking)",
    realTimeUpdate: "Real-Time Update",
    viewDetails: "View Details",
    workspaceTitle: "Main Workspace",
    sessionID: "Welcome! Your Session ID:",
    newTask: "New Task",
    searchPlaceholder: "Search Tasks (Full-text search)",
    filterStatus: "Filter by Status",
    filterDueDate: "Sort by Due Date",
    priorityHigh: "High Priority",
    noTasksFound: "No tasks found.",
    viewBuilding: (view) => `'${view.toUpperCase()}' View Under Construction`,
    viewFocus: (view) => `This artifact focuses on demonstrating Login and the Task Dashboard; the ${view} functionality is on the roadmap.`,
    // Textos adicionais para as novas views
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
    settingsConcurrency: "Optimistic Concurrency",
    settingsEvents: "Event Bus (Kafka/BullMQ)",
    settingsStatusOn: "ACTIVE and Functional",
    settingsStatusOff: "Disabled or Inactive",
    metricsTitle: "Service Monitoring (Prometheus/Grafana)",
    metricsLatency: "API p95 Latency (SLO < 200ms)",
    metricsQueue: "Worker Queue Backlog (BullMQ)",
    metricsErrors: "Backend Error Rate",
    metricsOk: "Target Met",
    metricsHigh: "Above Target",
  },
};

// --- Mapeamento de Ícones Arcanos ---
const IconMap = {
    Dashboard: '🔮', // Bola de Cristal
    Tasks: '📜',    // Pergaminho
    Members: '👁️‍🗨️', // Olho Místico
    Settings: '✨',  // Brilho/Magia
    Metrics: '⚛️',   // Energia/Átomo
    Logout: '🌌',   // Portal/Galáxia
    Search: '🔍',   // Lupa (Funcionalidade)
    NewTask: '⭐',   // Estrela
    StatusTodo: '🌑', // Lua Nova (A Fazer)
    StatusInProgress: '🌓', // Meia Lua (Em Progresso)
    StatusDone: '🌕', // Lua Cheia (Concluído)
    RealTime: '🌀',  // Vórtice/Círculo Mágico
    Loading: '💫'    // Desmaio/Vórtice para loading
};

// Estilo Neon (simulado com Text Shadow e cor brilhante)
const neonStyle = {
    color: '#a5b4fc', // Indigo 300 (Glow principal)
    textShadow: '0 0 5px #4f46e5, 0 0 10px #a5b4fc', // Glow Indigo
};

// Estilo Neon para o corpo principal (um pouco mais sutil)
const neonTextClass = "text-indigo-400 font-semibold";

// ===============================================
// === NOVAS VIEWS
// ===============================================

const DashboardSummary = ({ tasks, t }) => {
    const activeTasks = tasks.filter(t => t.status !== 'Concluído').length;
    const totalTasks = tasks.length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Tarefas Ativas */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                <p className="text-sm font-medium text-gray-500">{t.summaryTasks}</p>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-1">{activeTasks}/{totalTasks}</h2>
                <p className="text-xs text-indigo-500 mt-2 flex items-center">
                    <span className="mr-1">📜</span>
                    Mais {activeTasks} {t.menuTasks.toLowerCase()} em progresso.
                </p>
            </div>

            {/* Card 2: Membros */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-teal-500">
                <p className="text-sm font-medium text-gray-500">{t.summaryUsers}</p>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-1">5</h2>
                <p className="text-xs text-teal-500 mt-2 flex items-center">
                    <span className="mr-1">👁️‍🗨️</span>
                    {t.roleAdmin}: 1, {t.roleUser}: 4
                </p>
            </div>

            {/* Card 3: Progresso (Mock) */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
                <p className="text-sm font-medium text-gray-500">{t.summaryProgress}</p>
                <h2 className="text-3xl font-extrabold text-gray-900 mt-1">42%</h2>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '42%' }}></div>
                </div>
            </div>
        </div>
    );
};

const MembersView = ({ t }) => {
    const members = [
        { name: "Willian Cordeiro (Admin)", email: "willian.c@arcane.com", role: t.roleAdmin, status: 'Online', lastLogin: 'Agora' },
        { name: "Jane Doe", email: "jane@arcane.com", role: t.roleUser, status: 'Offline', lastLogin: '3h atrás' },
        { name: "João Silva", email: "joao@arcane.com", role: t.roleUser, status: 'Online', lastLogin: 'Agora' },
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
                        {members.map((member) => (
                            <tr key={member.email} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.role === t.roleAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {member.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {member.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.lastLogin}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SettingsView = ({ t, neonStyle }) => {
    const features = [
        { name: t.settingsRLS, status: t.settingsStatusOn, icon: '🔒', color: 'text-green-500' },
        { name: t.settingsConcurrency, status: t.settingsStatusOn, icon: '⚔️', color: 'text-green-500' },
        { name: t.settingsEvents, status: t.settingsStatusOn, icon: '🔗', color: 'text-green-500' },
        { name: "Dry-run Mode (Deletions)", status: t.settingsStatusOff, icon: '🧪', color: 'text-red-500' },
        { name: "Feature Flags", status: t.settingsStatusOn, icon: '🚩', color: 'text-green-500' },
    ];

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{t.settingsTitle}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-400 hover:shadow-xl transition-all">
                        <div className="flex justify-between items-center">
                            <span className={`text-3xl ${feature.color}`}>{feature.icon}</span>
                            <span className={`text-sm font-semibold ${feature.status === t.settingsStatusOn ? 'text-green-600' : 'text-red-600'}`}>
                                {feature.status}
                            </span>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mt-3">{feature.name}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {feature.name === t.settingsRLS && "Garante isolamento total entre os workspaces no PostgreSQL."}
                            {feature.name === t.settingsConcurrency && "Ativo. Requer o header If-Match para todas as operações PUT."}
                            {feature.name === t.settingsEvents && "Eventos emitidos para BullMQ para processamento assíncrono."}
                            {feature.name === "Dry-run Mode (Deletions)" && "Recurso desativado: deleção permanente imediata."}
                            {feature.name === "Feature Flags" && "Sistema de flags (LaunchDarkly mock) em uso para rollout gradual."}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MetricsView = ({ t, neonStyle }) => {
    const metricsData = [
        { name: t.metricsLatency, value: "185ms", target: "200ms", status: 'ok', icon: '🚀' },
        { name: t.metricsQueue, value: "2/1000", target: "100", status: 'ok', icon: '📈' },
        { name: t.metricsErrors, value: "1.5%", target: "1%", status: 'high', icon: '🚨' },
    ];

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{t.metricsTitle}</h1>

            <p className="text-sm text-gray-600 mb-6 flex items-center">
                <span className="text-lg mr-2" style={neonStyle}>{IconMap.Metrics}</span>
                Dados extraídos de Prometheus/Grafana (Mock). Status RTO: OK.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metricsData.map((metric, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-gray-400">
                        <div className="flex justify-between items-center">
                            <span className="text-3xl">{metric.icon}</span>
                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${metric.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {metric.status === 'ok' ? t.metricsOk : t.metricsHigh}
                            </span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 mt-3">{metric.value}</h2>
                        <p className="text-sm text-gray-500 mt-1">{metric.name}</p>
                        <p className="text-xs text-gray-400 mt-2">Target: {metric.target}</p>
                    </div>
                ))}
            </div>

            {/* Simulação de um Gráfico Grafana */}
            <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-3">Gráfico de Latência P95 (Simulação)</h3>
                <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                    [Gráfico de Linha representando Latência, com limite SLO em 200ms]
                </div>
            </div>
        </div>
    );
};


// ===============================================
// === COMPONENTES PRINCIPAIS
// ===============================================

const Sidebar = ({ currentView, setView, lang, setLang, t }) => {
  const navItems = [
    { name: t.menuDashboard, iconKey: 'Dashboard', view: 'dashboard' },
    { name: t.menuTasks, iconKey: 'Tasks', view: 'tasks' },
    { name: t.menuMembers, iconKey: 'Members', view: 'members' },
    { name: t.menuSettings, iconKey: 'Settings', view: 'settings' },
    { name: t.menuMetrics, iconKey: 'Metrics', view: 'metrics' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 p-4 w-64 md:w-56 flex-shrink-0">
      <div className={`text-xl font-bold tracking-wider mb-2 ${neonTextClass}`}>
        {t.appTitle}
      </div>

      {/* Seletor de Idioma */}
      <div className="mb-6 p-2 bg-gray-800 rounded-lg flex items-center justify-between border border-gray-700">
        <span className="text-xl mr-2" style={neonStyle}>🌐</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="bg-gray-800 text-sm text-white focus:ring-0 focus:border-0 border-none w-full cursor-pointer"
        >
          <option value="pt">Português (PT)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      <nav className="flex-grow space-y-2">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setView(item.view)}
            className={`flex items-center w-full p-2 rounded-lg transition-colors duration-200 ${
              currentView === item.view 
                ? 'bg-indigo-700 text-white font-semibold shadow-xl shadow-indigo-900/50' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-lg w-5 h-5 mr-3 flex items-center justify-center" style={neonStyle}>{IconMap[item.iconKey]}</span>
            <span className="text-sm">{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={() => alert(t.logout)} // Substituir por lógica de logout
          className="flex items-center w-full p-2 text-red-400 hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <span className="text-lg w-5 h-5 mr-3 flex items-center justify-center" style={neonStyle}>{IconMap.Logout}</span>
          <span className="text-sm">{t.logout}</span>
        </button>
      </div>
    </div>
  );
};

const TaskCard = ({ task, t }) => {
  // 1. Resolve o Status traduzido (ex: "Em Progresso" -> "In Progress")
  const statusText = t.statusMapping[task.status] || task.status;

  // 2. Resolve o IconKey baseado no status (para mapear o emoji)
  // Usa o valor traduzido para encontrar a chave de mapeamento
  const iconKey = useMemo(() => {
    if (statusText === t.statusTodo) return 'StatusTodo';
    if (statusText === t.statusInProgress) return 'StatusInProgress';
    if (statusText === t.statusDone) return 'StatusDone';
    return 'StatusTodo';
  }, [statusText, t.statusTodo, t.statusInProgress, t.statusDone]);

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
        {/* CORREÇÃO AQUI: Usa o mapeamento de tradução para exibir o título da tarefa */}
        <h3 className="text-lg font-semibold text-gray-800 break-words line-clamp-2">
            {t.taskTitles[task.title] || task.title}
        </h3>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${bg} ${text} flex items-center ml-4 flex-shrink-0`}>
          {/* Garante que o ícone e o texto do status sejam baseados no 'statusText' */}
          <span className={`w-4 h-4 mr-1 text-sm flex items-center justify-center ${iconClass}`}>{IconMap[iconKey]}</span>
          {statusText}
        </span>
      </div>
      <div className="space-y-1 text-sm text-gray-500">
        <p><strong>{t.responsible}:</strong> {task.assignee}</p>
        <p><strong>{t.dueDate}:</strong> <span className={priorityColor}>{task.dueDate}</span></p>
        <p><strong>{t.versionLocking}:</strong> V{task.version}</p>
        <p className={`flex items-center text-xs mt-2 ${neonTextClass}`}>
          <span className="text-base mr-1" style={neonStyle}>{IconMap.RealTime}</span>
          {t.realTimeUpdate}
        </p>
      </div>
      <button className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/50">
        {t.viewDetails}
      </button>
    </div>
  );
};

const MainDashboard = ({ tasks, userId, t }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    return tasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  const truncatedUserId = userId.substring(0, 8) + '...';

  return (
    <div className="flex-grow p-4 md:p-8 overflow-y-auto">
      <header className="mb-8 border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{t.workspaceTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.sessionID} <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{truncatedUserId}</span></p>
        </div>
        <button className="mt-4 md:mt-0 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-lg shadow-indigo-500/50 hover:bg-indigo-700 transition-transform transform hover:scale-105 flex items-center">
          <span className="text-lg mr-2" style={neonStyle}>{IconMap.NewTask}</span>
          {t.newTask}
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Barra de Busca Avançada (Search GIN/ElasticSearch) */}
        <div className="relative flex-grow">
          <span className="text-lg absolute top-1/2 left-4 transform -translate-y-1/2 text-gray-400">{IconMap.Search}</span>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            // CORREÇÃO: Adicionando 'text-gray-900' e 'placeholder-gray-500' para forçar a cor
            className="w-full py-3 pl-12 pr-4 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-md text-gray-900 placeholder-gray-500"
          />
        </div>

        {/* Filtros e Controles */}
        <div className="flex gap-4 flex-wrap justify-end">
          <select className="py-3 px-4 border border-gray-300 rounded-xl shadow-md text-sm">
            <option>{t.filterStatus}</option>
            <option>{t.statusTodo}</option>
            <option>{t.statusInProgress}</option>
          </select>
          <select className="py-3 px-4 border border-gray-300 rounded-xl shadow-md text-sm">
            <option>{t.filterDueDate}</option>
            <option>{t.priorityHigh}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => <TaskCard key={task.id} task={task} t={t} />)
        ) : (
          <div className="col-span-full text-center py-10 bg-gray-50 rounded-xl">
            <p className="text-gray-500">{t.noTasksFound}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin, t }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback((e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      // Senha: arcane123
      if (email === "user@arcane.com" && password === "arcane123") {
        onLogin({ userId: "1c3b9f4a-7d2e-4c5a-8b1e-0a5d4c3f2b1a" });
      } else {
        alert(t.loginFail);
      }
      setIsLoading(false);
    }, 1500);
  }, [email, password, onLogin, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-200">
        <h1 className="text-4xl font-extrabold text-center mb-2 text-gray-900">{t.appTitle}</h1>
        <p className="text-center text-gray-500 mb-8">{t.appSubtitle}</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Força a cor escura para o texto digitado e placeholder
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-gray-900 placeholder-gray-500"
              placeholder="user@arcane.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // Força a cor escura para o texto digitado e placeholder
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-gray-900 placeholder-gray-500"
              placeholder="arcane123"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-indigo-500/50 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 disabled:bg-indigo-400"
          >
            {isLoading ? <span className="mr-2 animate-spin" style={neonStyle}>{IconMap.Loading}</span> : t.loginButton}
          </button>
        </form>
      </div>
    </div>
  );
};


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [currentView, setCurrentView] = useState('tasks');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState('pt');

  const t = translations[lang];

  const handleLogin = useCallback((userData) => {
    setUserId(userData.userId);
    setIsAuthenticated(true);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} t={t} />;
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-gray-50">

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar currentView={currentView} setView={setCurrentView} lang={lang} setLang={setLang} t={t} />
      </div>

      {/* Mobile Header/Menu */}
      <header className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center w-full fixed top-0 left-0 z-40">
        <span className={`text-xl font-bold tracking-wider ${neonTextClass}`}>{t.appTitle}</span>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded hover:bg-gray-700 transition-colors"
        >
          {isSidebarOpen ? <span className="text-lg" style={neonStyle}>{IconMap.Logout}</span> : <span className="text-2xl">☰</span>}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          <div className="fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out w-64">
            <Sidebar currentView={currentView} setView={setCurrentView} lang={lang} setLang={setLang} t={t} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex flex-col flex-grow overflow-y-auto pt-16 md:pt-0">
        {currentView === 'dashboard' && <DashboardSummary tasks={MOCK_TASKS} t={t} />}
        {currentView === 'tasks' && <MainDashboard tasks={MOCK_TASKS} userId={userId} t={t} />}
        {currentView === 'members' && <MembersView t={t} />}
        {currentView === 'settings' && <SettingsView t={t} neonStyle={neonStyle} />}
        {currentView === 'metrics' && <MetricsView t={t} neonStyle={neonStyle} />}

        {/* Placeholder para outras views - REMOVIDO pois todas as views estão preenchidas */}
        {!(currentView === 'tasks' || currentView === 'dashboard' || currentView === 'members' || currentView === 'settings' || currentView === 'metrics') && (
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-2xl font-bold mt-20">{t.viewBuilding(currentView)}</h2>
            <p>{t.viewFocus(currentView)}</p>
          </div>
        )}
      </main>
    </div>
  );
}