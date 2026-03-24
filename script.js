// ===================== Supabase 設定 =====================
const SUPABASE_URL = 'https://ylpjjbrdkgkxnavsodvm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscGpqYnJka2dreG5hdnNvZHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjY4NzcsImV4cCI6MjA4OTMwMjg3N30.rV-Vzz4iElLOEKc5CKvNGu38ZMvSsK_E2hg_lIGhfQk';
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================== Grid 設定 =====================
const GRID_SIZE = 5;
const CENTER_INDEX = Math.floor(GRID_SIZE / 2);
const LEVEL_ORDER = ['S', 'A', 'B', 'C'];
const START_NUMBER_BY_LEVEL = { S: 1, A: 2, B: 10, C: 18 };
const levelLabel = { S: '金色', A: '淡藍色', B: '淡綠色', C: '灰色' };

// ===================== DOM 元素 =====================
const REQUIRED_ELEMENT_IDS = [
  'authScreen',
  'app',
  'loginForm',
  'authMessage',
  'userBadge',
  'taskGrid',
  'sidebar',
  'menuButton',
  'closeButton',
  'overlay',
  'logoutButton',
  'sidebarTitle',
  'sidebarLevel',
  'sidebarTitleInput',
  'sidebarDescInput',
  'sidebarCompleted',
  'sidebarSaveBtn',
];

const dom = {};
const missingIds = [];

REQUIRED_ELEMENT_IDS.forEach((id) => {
  const element = document.getElementById(id);
  dom[id] = element;
  if (!element) missingIds.push(id);
});

if (missingIds.length > 0) {
  console.error(
    `找不到以下 DOM 元素（getElementById 回傳 null）：${missingIds.join(', ')}。` +
      '常見原因：id 拼字不一致、元素尚未渲染、或 script.js 被掛在沒有這些元素的頁面。'
  );
}

const authScreen = dom.authScreen;
const app = dom.app;
const loginForm = dom.loginForm;
const authMessage = dom.authMessage;
const userBadge = dom.userBadge;
const gridElement = dom.taskGrid;
const sidebar = dom.sidebar;
const menuButton = dom.menuButton;
const closeButton = dom.closeButton;
const overlay = dom.overlay;
const logoutButton = dom.logoutButton;
const sidebarTitleEl = dom.sidebarTitle;
const sidebarLevelEl = dom.sidebarLevel;
const sidebarTitleInput = dom.sidebarTitleInput;
const sidebarDescInput = dom.sidebarDescInput;
const sidebarCompleted = dom.sidebarCompleted;
const sidebarSaveBtn = dom.sidebarSaveBtn;

if (loginForm) {
  loginForm.setAttribute('method', 'post');
  loginForm.setAttribute('action', '#');
}

// ===================== Grid 計算 =====================
function getTaskLevel(row, col) {
  if (row === CENTER_INDEX && col === CENTER_INDEX) return 'S';
  if (row === col || row + col === GRID_SIZE - 1) return 'A';
  if (row === CENTER_INDEX || col === CENTER_INDEX) return 'B';
  return 'C';
}

const positions = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return { row, col, level: getTaskLevel(row, col) };
});

const tasks = [];
LEVEL_ORDER.forEach((level) => {
  const levelPositions = positions.filter((p) => p.level === level);
  levelPositions.forEach((position, index) => {
    const id = START_NUMBER_BY_LEVEL[level] + index;
    tasks.push({
      id,
      row: position.row,
      col: position.col,
      level,
      title: `任務 ${id}`,
      description: `連線難度等級：${level}（${levelLabel[level]}）`,
      completed: false,
    });
  });
});
tasks.sort((a, b) => a.row - b.row || a.col - b.col);

// ===================== 載入 DB 資料 =====================
async function loadTasksFromDB() {
  const { data, error } = await supabase.from('tasks').select('*');
  if (error) {
    console.error('載入失敗:', error.message);
    return;
  }
  data.forEach((dbTask) => {
    const task = tasks.find((t) => t.id === dbTask.task_number);
    if (task) {
      if (dbTask.title) task.title = dbTask.title;
      if (dbTask.description) task.description = dbTask.description;
      task.completed = dbTask.completed;
    }
  });
}

// ===================== 儲存單一任務 =====================
async function saveTask(taskId, updates) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  const payload = {
    task_number: taskId,
    row: task.row,
    col: task.col,
    level: task.level,
    title: updates.title !== undefined ? updates.title : task.title,
    description: updates.description !== undefined ? updates.description : task.description,
    completed: updates.completed !== undefined ? updates.completed : task.completed,
  };
  const { error } = await supabase
    .from('tasks')
    .upsert(payload, { onConflict: 'user_id,task_number' });
  if (error) console.error('儲存失敗:', error.message);
}

// ===================== Render Grid =====================
function renderGrid() {
  gridElement.innerHTML = '';
  const fragment = document.createDocumentFragment();
  tasks.forEach((task, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `task-cell level-${task.level}${task.completed ? ' completed' : ''}`;
    cell.textContent = `${task.id}`;
    cell.style.setProperty('--i', index + 1);
    cell.setAttribute('aria-label', `${task.title}，難度 ${task.level}`);
    cell.addEventListener('click', () => openSidebar(task));
    fragment.appendChild(cell);
  });
  gridElement.appendChild(fragment);
}

// ===================== Sidebar =====================
let currentTask = null;

function openSidebar(task) {
  currentTask = task;
  sidebarTitleEl.textContent = `任務 ${task.id}`;
  sidebarLevelEl.textContent = `難度：${task.level}（${levelLabel[task.level]}）`;
  sidebarTitleInput.value = task.title;
  sidebarDescInput.value = task.description;
  sidebarCompleted.checked = task.completed;
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  overlay.classList.remove('hidden');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  overlay.classList.add('hidden');
  currentTask = null;
}

sidebarSaveBtn?.addEventListener('click', async () => {
  if (!currentTask) return;
  const updates = {
    title: sidebarTitleInput.value.trim(),
    description: sidebarDescInput.value.trim(),
    completed: sidebarCompleted.checked,
  };
  currentTask.title = updates.title;
  currentTask.description = updates.description;
  currentTask.completed = updates.completed;
  await saveTask(currentTask.id, updates);
  renderGrid();
  closeSidebar();
});

// ===================== 登入 =====================
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const submitButton = loginForm.querySelector("button[type='submit']");
    if (!submitButton) {
      console.error("loginForm 內找不到 submit button，已取消送出。");
      return;
    }
    submitButton.disabled = true;
    authMessage.textContent = '登入中...';
    const formData = new FormData(loginForm);
    const email = formData.get('username').toString().trim();
    const password = formData.get('password').toString();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    submitButton.disabled = false;
    if (error) {
      authMessage.textContent = '登入失敗：' + error.message;
      return;
    }
    await onLogin(data.user);
  });
} else {
  console.error('loginForm 不存在：無法攔截 submit，請確認 <form id="loginForm"> 是否存在。');
}

async function onLogin(user) {
  await loadTasksFromDB();
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');
  authMessage.textContent = '';
  userBadge.textContent = user.email;
  renderGrid();
}

// ===================== 登出 =====================
logoutButton?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  tasks.forEach((t) => {
    t.title = `任務 ${t.id}`;
    t.description = `連線難度等級：${t.level}（${levelLabel[t.level]}）`;
    t.completed = false;
  });
  app.classList.add('hidden');
  authScreen.classList.remove('hidden');
  gridElement.innerHTML = '';
});

// ===================== 事件 =====================
closeButton?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeSidebar();
});

// ===================== 初始化：檢查是否已登入 =====================
if (missingIds.length === 0) {
  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await onLogin(session.user);
    }
  })();
}
