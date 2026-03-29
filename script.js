// ===================== Grid 設定 =====================
const GRID_SIZE = 5;
const CENTER_INDEX = Math.floor(GRID_SIZE / 2);
const LEVEL_ORDER = ['S', 'A', 'B', 'C', 'N'];
const LEVEL_QUOTA = { S: 1, A: 2, B: 4, C: 8, N: 10 };
const levelLabel = {
  S: '金',
  A: '紫',
  B: '藍',
  C: '綠',
  N: '灰',
};

// ===================== DOM 元素 =====================
const REQUIRED_ELEMENT_IDS = ['taskGrid', 'sidebar', 'menuButton', 'closeButton', 'overlay', 'taskDetails'];

const dom = {};
const missingIds = [];

REQUIRED_ELEMENT_IDS.forEach((id) => {
  const element = document.getElementById(id);
  dom[id] = element;
  if (!element) missingIds.push(id);
});

if (missingIds.length > 0) {
  console.error(`找不到以下 DOM 元素：${missingIds.join(', ')}`);
}

const gridElement = dom.taskGrid;
const sidebar = dom.sidebar;
const menuButton = dom.menuButton;
const closeButton = dom.closeButton;
const overlay = dom.overlay;
const taskDetails = dom.taskDetails;

// ===================== 任務生成 =====================
function getDistanceScore(row, col) {
  return Math.abs(row - CENTER_INDEX) + Math.abs(col - CENTER_INDEX);
}

function getTieBreaker(row, col) {
  return Math.abs(row - CENTER_INDEX) * 10 + Math.abs(col - CENTER_INDEX);
}

const positions = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return {
    row,
    col,
    distance: getDistanceScore(row, col),
    tie: getTieBreaker(row, col),
  };
}).sort((a, b) => a.distance - b.distance || a.tie - b.tie || a.row - b.row || a.col - b.col);

let cursor = 0;
const tasks = [];

LEVEL_ORDER.forEach((level) => {
  for (let i = 1; i <= LEVEL_QUOTA[level]; i += 1) {
    const position = positions[cursor];
    cursor += 1;
    tasks.push({
      code: `${level}${i}`,
      row: position.row,
      col: position.col,
      level,
      title: `${level}${i} 任務`,
      description: `${level} 級任務（${levelLabel[level]}）`,
      completed: false,
    });
  }
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
    cell.style.setProperty('--i', index + 1);
    cell.setAttribute('aria-label', `${task.code}，${task.title}`);
    cell.addEventListener('click', () => {
      // 依需求：點主頁格子不顯示任務內容
    });
    fragment.appendChild(cell);
  });

  gridElement.appendChild(fragment);
}

function renderTaskDetails() {
  taskDetails.innerHTML = '';
  const fragment = document.createDocumentFragment();

  tasks
    .slice()
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || Number(a.code.slice(1)) - Number(b.code.slice(1)))
    .forEach((task) => {
      const item = document.createElement('li');
      item.className = 'task-detail-item';

      const header = document.createElement('div');
      header.className = 'task-detail-head';

      const code = document.createElement('span');
      code.className = `task-code level-${task.level}`;
      code.textContent = task.code;

      const statusLabel = document.createElement('label');
      statusLabel.className = 'task-detail-check';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        renderGrid();
      });
      statusLabel.append(checkbox, document.createTextNode('完成'));

      header.append(code, statusLabel);

      const title = document.createElement('p');
      title.className = 'task-detail-title';
      title.textContent = task.title;

      const description = document.createElement('p');
      description.className = 'task-detail-desc';
      description.textContent = task.description;

      item.append(header, title, description);
      fragment.appendChild(item);
    });

  taskDetails.appendChild(fragment);
}

// ===================== Sidebar =====================
function openSidebar() {
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
}

// ===================== 事件 =====================
menuButton?.addEventListener('click', openSidebar);
closeButton?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeSidebar();
});

if (missingIds.length === 0) {
  renderGrid();
  renderTaskDetails();
}
