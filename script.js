// ===================== Supabase 設定 =====================
const SUPABASE_URL = 'https://ylpjjbrdkgkxnavsodvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fladNfkVAfvrHaH1qz3Dww_kHl0j2Ng';
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================== Grid 設定 =====================
const GRID_SIZE = 5;
const CENTER_INDEX = Math.floor(GRID_SIZE / 2);
const LEVEL_ORDER = ['S', 'A', 'B', 'C'];
const START_NUMBER_BY_LEVEL = { S: 1, A: 2, B: 10, C: 18 };
const levelLabel = { S: '金色', A: '淡藍色', B: '淡綠色', C: '灰色' };

// ===================== DOM 元素 =====================
const authScreen   = document.getElementById('authScreen');
const app          = document.getElementById('app');
const loginForm    = document.getElementById('loginForm');
const authMessage  = document.getElementById('authMessage');
const userBadge    = document.getElementById('userBadge');
const gridElement  = document.getElementById('taskGrid');
const sidebar      = document.getElementById('sidebar');
const menuButton   = document.getElementById('menuButton');
const closeButton  = document.getElementById('closeButton');
const overlay      = document.getElementById('overlay');
const logoutButton = document.getElementById('logoutButton');
const sidebarTitleEl    = document.getElementById('sidebarTitle');
const sidebarLevelEl    = document.getElementById('sidebarLevel');
const sidebarTitleInput = document.getElementById('sidebarTitleInput');
const sidebarDescInput  = document.getElementById('sidebarDescInput');
const sidebarCompleted  = document.getElementById('sidebarCompleted');
const sidebarSaveBtn    = document.getElementById('sidebarSaveBtn');

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
  if (error) { console.error('載入失敗:', error.message); return; }
  data.forEach((dbTask) => {
    const task = tasks.find((t) => t.id === dbTask.task_number);
    if (task) {
      if (dbTask.title)       task.title       = dbTask.title;
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
    row:         task.row,
    col:         task.col,
    level:       task.level,
    title:       updates.title       !== undefined ? updates.title       : task.title,
    description: updates.description !== undefined ? updates.description : task.description,
    completed:   updates.completed   !== undefined ? updates.completed   : task.completed,
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
  sidebarTitleEl.textContent    = `任務 ${task.id}`;
  sidebarLevelEl.textContent    = `難度：${task.level}（${levelLabel[task.level]}）`;
  sidebarTitleInput.value       = task.title;
  sidebarDescInput.value        = task.description;
  sidebarCompleted.checked      = task.completed;
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

sidebarSaveBtn.addEventListener('click', async () => {
  if (!currentTask) return;
  const updates = {
    title:       sidebarTitleInput.value.trim(),
    description: sidebarDescInput.value.trim(),
    completed:   sidebarCompleted.checked,
  };
  currentTask.title       = updates.title;
  currentTask.description = updates.description;
  currentTask.completed   = updates.completed;
  await saveTask(currentTask.id, updates);
  renderGrid();
  closeSidebar();
});

// ===================== 登入 =====================
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  authMessage.textContent = '登入中...';

  const formData = new FormData(loginForm);
  const email    = formData.get('username').toString().trim();
  const password = formData.get('password').toString();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  submitButton.disabled = false;

  if (error) {
    authMessage.textContent = '登入失敗：' + error.message;
    return;
  }
  await onLogin(data.user);
});

async function onLogin(user) {
  await loadTasksFromDB();
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');
  authMessage.textContent = '';
  userBadge.textContent = user.email;
  renderGrid();
}

// ===================== 登出 =====================
logoutButton.addEventListener('click', async () => {
  await supabase.auth.signOut();
  tasks.forEach((t) => { t.title = `任務 ${t.id}`; t.description = `連線難度等級：${t.level}（${levelLabel[t.level]}）`; t.completed = false; });
  app.classList.add('hidden');
  authScreen.classList.remove('hidden');
  gridElement.innerHTML = '';
});

// ===================== 事件 =====================
closeSidebar && closeButton.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

// ===================== 初始化：檢查是否已登入 =====================
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await onLogin(session.user);
  }
})();
