// ===================== Grid 設定 =====================
const GRID_SIZE = 5;
const LEVEL_ORDER = ['S', 'A', 'B', 'C', 'N'];
const LEVEL_QUOTA = { S: 1, A: 2, B: 4, C: 8, N: 10 };
const levelLabel = {
  S: '金',
  A: '粉',
  B: '藍',
  C: '綠',
  N: '灰',
};

const LEVEL_POSITIONS = {
  S: [13],
  A: [1, 25],
  B: [7, 9, 17, 19],
  C: [3, 8, 11, 12, 14, 15, 18, 23],
};

// ===================== DOM 元素 =====================
const REQUIRED_ELEMENT_IDS = ['taskGrid', 'sidebar', 'menuButton', 'closeButton', 'overlay', 'taskDetails', 'deadlineCountdown'];

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
const deadlineCountdown = dom.deadlineCountdown;

// ===================== 任務生成 =====================
function getLevelByCell(cellNumber) {
  for (const [level, cells] of Object.entries(LEVEL_POSITIONS)) {
    if (cells.includes(cellNumber)) return level;
  }
  return 'N';
}

function generateTasks() {
  const tasks = [];
  const levelCount = {};
  LEVEL_ORDER.forEach((l) => (levelCount[l] = 0));

  for (let i = 1; i <= GRID_SIZE * GRID_SIZE; i++) {
    const level = getLevelByCell(i);
    levelCount[level]++;
    tasks.push({
      id: i,
      level,
      index: levelCount[level],
      title: '',
      done: false,
    });
  }
  return tasks;
}

// ===================== 資料庫 =====================
let currentUser = null;
let tasks = generateTasks();

function getDbRef(uid) {
  return db.ref('users/' + uid + '/tasks');
}

function saveTasksToDb() {
  if (!currentUser) return;
  getDbRef(currentUser.uid).set(tasks);
}

function loadTasksFromDb(uid) {
  getDbRef(uid).once('value', (snapshot) => {
    const data = snapshot.val();
    if (data && Array.isArray(data)) {
      tasks = data;
    } else {
      tasks = generateTasks();
    }
    renderGrid();
  });
}

// ===================== 渲染格子 =====================
function renderGrid() {
  if (!gridElement) return;
  gridElement.innerHTML = '';

  tasks.forEach((task) => {
    const cell = document.createElement('div');
    const doneClass = task.done ? ' completed' : '';
    cell.className = `task-cell level-${task.level}${doneClass}`;
    cell.dataset.id = task.id;
    if (task.done) {
      const today = new Date();
      cell.dataset.stampDate = `${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}/${String(today.getDate()).padStart(2,'0')}`;
    }
    cell.textContent = task.title || `${task.level}×${task.index}`;
    cell.addEventListener('click', () => openSidebar(task.id));
    gridElement.appendChild(cell);
  });
}

// ===================== Sidebar =====================
function openSidebar(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  taskDetails.innerHTML = '';

  // Title
  const titleLi = document.createElement('li');
  titleLi.innerHTML = `<strong>標題</strong>`;
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.title;
  titleInput.placeholder = '輸入任務標題';
  titleInput.style.cssText = 'width:100%;padding:6px;margin-top:4px;border-radius:6px;border:1px solid #ccc;background:#fff;color:#1a2340;font-size:0.9rem;';
  titleInput.addEventListener('input', (e) => {
    task.title = e.target.value;
    saveTasksToDb();
    renderGrid();
  });
  titleLi.appendChild(titleInput);
  taskDetails.appendChild(titleLi);

  // Done toggle
  const doneLi = document.createElement('li');
  doneLi.style.marginTop = '12px';
  const doneCheckbox = document.createElement('input');
  doneCheckbox.type = 'checkbox';
  doneCheckbox.checked = task.done;
  doneCheckbox.id = 'doneCheck';
  doneCheckbox.style.width = '16px';
  doneCheckbox.style.height = '16px';
  doneCheckbox.addEventListener('change', (e) => {
    task.done = e.target.checked;
    saveTasksToDb();
    renderGrid();
  });
  const doneCheckLabel = document.createElement('label');
  doneCheckLabel.htmlFor = 'doneCheck';
  doneCheckLabel.textContent = ' 已完成';
  doneCheckLabel.style.marginLeft = '6px';
  doneCheckLabel.style.fontSize = '0.9rem';
  doneLi.appendChild(doneCheckbox);
  doneLi.appendChild(doneCheckLabel);
  taskDetails.appendChild(doneLi);

  // Level info
  const infoLi = document.createElement('li');
  infoLi.style.marginTop = '12px';
  infoLi.style.fontSize = '0.9rem';
  infoLi.innerHTML = `<strong>等級：</strong>${task.level} (${levelLabel[task.level]})`;
  taskDetails.appendChild(infoLi);

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

// ===================== Deadline Countdown =====================
const DEADLINE_DATE = new Date('2028-01-01T00:00:00');

function formatUnit(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function updateDeadlineCountdown() {
  if (!deadlineCountdown) return;
  const diffMs = DEADLINE_DATE.getTime() - Date.now();
  if (diffMs <= 0) {
    deadlineCountdown.textContent = '0 days 0 hours 0 mins 0 secs';
    return;
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  deadlineCountdown.textContent =
    `${formatUnit(days, 'day', 'days')} ` +
    `${formatUnit(hours, 'hour', 'hours')} ` +
    `${formatUnit(mins, 'min', 'mins')} ` +
    `${formatUnit(secs, 'sec', 'secs')}`;
}

setInterval(updateDeadlineCountdown, 1000);
updateDeadlineCountdown();

// ===================== Firebase 驗證 =====================
const loginScreen = document.getElementById('loginScreen');
const appDiv = document.getElementById('app');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userInfo = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');

function showApp(user) {
  currentUser = user;
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appDiv) appDiv.style.display = '';
  if (userInfo) userInfo.style.display = 'flex';
  if (userAvatar) {
    userAvatar.src = user.photoURL || '';
    userAvatar.alt = user.displayName || '';
  }
  loadTasksFromDb(user.uid);
}

function showLogin() {
  currentUser = null;
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (appDiv) appDiv.style.display = 'none';
  if (userInfo) userInfo.style.display = 'none';
}

auth.onAuthStateChanged((user) => {
  if (user) {
    showApp(user);
  } else {
    showLogin();
  }
});

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((err) => {
      console.error('登入失敗', err);
      alert('登入失敗：' + err.message);
    });
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
    auth.signOut();
  });
}

// ===================== 事件 =====================
menuButton?.addEventListener('click', () => {
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  }
});
closeButton?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeSidebar();
});
