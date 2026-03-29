// ===================== Grid 設定 =====================
const GRID_SIZE = 5;
const CENTER_INDEX = Math.floor(GRID_SIZE / 2);
const LEVEL_ORDER = ['S', 'A', 'B', 'C'];
const START_NUMBER_BY_LEVEL = { S: 1, A: 2, B: 10, C: 18 };
const levelLabel = { S: '金色', A: '淡藍色', B: '淡綠色', C: '灰色' };

// ===================== DOM 元素 =====================
const REQUIRED_ELEMENT_IDS = [
  'app',
  'taskGrid',
  'sidebar',
  'menuButton',
  'closeButton',
  'overlay',
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

const gridElement = dom.taskGrid;
const sidebar = dom.sidebar;
const menuButton = dom.menuButton;
const closeButton = dom.closeButton;
const overlay = dom.overlay;
const sidebarTitleEl = dom.sidebarTitle;
const sidebarLevelEl = dom.sidebarLevel;
const sidebarTitleInput = dom.sidebarTitleInput;
const sidebarDescInput = dom.sidebarDescInput;
const sidebarCompleted = dom.sidebarCompleted;
const sidebarSaveBtn = dom.sidebarSaveBtn;

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

sidebarSaveBtn?.addEventListener('click', () => {
  if (!currentTask) return;
  currentTask.title = sidebarTitleInput.value.trim();
  currentTask.description = sidebarDescInput.value.trim();
  currentTask.completed = sidebarCompleted.checked;
  renderGrid();
  closeSidebar();
});

// ===================== 事件 =====================
closeButton?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeSidebar();
});

if (missingIds.length === 0) {
  renderGrid();
}
