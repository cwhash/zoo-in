// ===================== Grid 設定 =====================
const GRID_SIZE = 5;
const LEVEL_ORDER = ['S', 'A', 'B', 'C', 'N'];
const LEVEL_QUOTA = { S: 1, A: 2, B: 4, C: 8, N: 10 };
const GRID_SEQUENCE = [
  'A1', 'N1', 'C1', 'N2', 'N3',
  'N4', 'B1', 'C2', 'B2', 'N5',
  'C3', 'C4', 'S1', 'C5', 'C6',
  'N6', 'B3', 'C7', 'B4', 'N7',
  'N8', 'N9', 'C8', 'N10', 'A2',
];
const TASK_LIST_SEQUENCE = [
  'S1',
  'A1', 'A2',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10',
];
const TASK_LIST_ORDER = new Map(TASK_LIST_SEQUENCE.map((code, idx) => [code, idx]));
const levelLabel = {
  S: '金',
  A: '粉',
  B: '藍',
  C: '綠',
  N: '灰',
};

// ===================== DOM 元素 =====================
const REQUIRED_ELEMENT_IDS = [
  'taskGrid',
  'sidebar',
  'menuButton',
  'closeButton',
  'overlay',
  'taskDetails',
  'deadlineCountdown',
  'sidebarTitle',
  'userMenuButton',
  'userMenuPanel',
  'memberRealNameInput',
  'memberNickNameInput',
  'memberAddressInput',
  'memberSaveBtn',
];

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
const sidebarTitle = dom.sidebarTitle;
const userMenuButton = dom.userMenuButton;
const userMenuPanel = dom.userMenuPanel;
const memberRealNameInput = dom.memberRealNameInput;
const memberNickNameInput = dom.memberNickNameInput;
const memberAddressInput = dom.memberAddressInput;
const memberSaveBtn = dom.memberSaveBtn;

// ===================== 任務生成 =====================
function generateTasks() {
  const tasks = [];
  for (let i = 1; i <= GRID_SEQUENCE.length; i++) {
    const code = GRID_SEQUENCE[i - 1];
    const level = code[0];
    const index = Number(code.slice(1));
    tasks.push({
      task_id: code,
      level,
      index,
      code,
      task_title: '',
      task_description: '',
      task_status: false,
      task_completion_time: null,
      task_image_URL: null,
    });
  }
  return tasks;
}

// ===================== 資料庫 =====================
let currentUser = null;
let tasks = generateTasks();
let memberInfo = null;
let memberInfoLoadVersion = 0;
let tasksLoadVersion = 0;

function isTaskLike(task) {
  return task && typeof task === 'object' && typeof task.task_id === 'string';
}

function normalizeTasks(rawTasks) {
  const defaults = generateTasks();
  if (!Array.isArray(rawTasks)) return defaults;

  return defaults.map((defaultTask, idx) => {
    const savedTask = rawTasks[idx] || {};
    return {
      ...defaultTask,
      ...savedTask,
      task_id: defaultTask.task_id,
      level: defaultTask.level,
      index: defaultTask.index,
      code: defaultTask.code,
      task_title: typeof savedTask.task_title === 'string'
        ? savedTask.task_title
        : (typeof savedTask.title === 'string' ? savedTask.title : ''),
      task_description: typeof savedTask.task_description === 'string' ? savedTask.task_description : '',
      task_status: typeof savedTask.task_status === 'boolean' ? savedTask.task_status : Boolean(savedTask.done),
      task_completion_time: Number.isFinite(Number(savedTask.task_completion_time))
        ? Number(savedTask.task_completion_time)
        : null,
      task_image_URL: savedTask.task_image_URL ?? null,
    };
  });
}

function ensureRenderableTasks() {
  if (!Array.isArray(tasks) || tasks.length !== GRID_SEQUENCE.length || tasks.some((task) => !isTaskLike(task))) {
    tasks = normalizeTasks(tasks);
  }
}

function getMemberInfoRef(uid) {
  return db.ref('users/' + uid + '/member_info');
}

function getTaskListRef(uid) {
  return db.ref('users/' + uid + '/life_grid_2027/task_list');
}

function getDefaultMemberInfo() {
  return {
    member_id: Date.now(),
    authenticated_user: true,
    real_name: '',
    nick_name: '',
    address: '',
    notes: '',
  };
}

function normalizeMemberInfo(rawMemberInfo) {
  const defaults = getDefaultMemberInfo();
  if (!rawMemberInfo || typeof rawMemberInfo !== 'object') return defaults;

  return {
    ...defaults,
    ...rawMemberInfo,
    real_name: typeof rawMemberInfo.real_name === 'string' ? rawMemberInfo.real_name : '',
    nick_name: typeof rawMemberInfo.nick_name === 'string' ? rawMemberInfo.nick_name : '',
    address: typeof rawMemberInfo.address === 'string' ? rawMemberInfo.address : '',
  };
}

function renderMemberInfoPanel() {
  if (!memberRealNameInput || !memberNickNameInput || !memberAddressInput) return;
  memberRealNameInput.value = memberInfo?.real_name || '';
  memberNickNameInput.value = memberInfo?.nick_name || '';
  memberAddressInput.value = memberInfo?.address || '';
}

function closeUserMenu() {
  if (!userMenuPanel || !userMenuButton) return;
  userMenuPanel.classList.add('hidden');
  userMenuPanel.setAttribute('aria-hidden', 'true');
  userMenuButton.setAttribute('aria-expanded', 'false');
}

function isUserMenuOpen() {
  return Boolean(userMenuPanel && !userMenuPanel.classList.contains('hidden'));
}

function openUserMenu() {
  if (!userMenuPanel || !userMenuButton) return;
  renderMemberInfoPanel();
  userMenuPanel.classList.remove('hidden');
  userMenuPanel.setAttribute('aria-hidden', 'false');
  userMenuButton.setAttribute('aria-expanded', 'true');
}

function toggleUserMenu() {
  if (isUserMenuOpen()) {
    closeUserMenu();
    return;
  }
  openUserMenu();
}

function saveMemberInfoToDb() {
  if (!currentUser) return Promise.resolve(false);
  if (!memberInfo) memberInfo = getDefaultMemberInfo();
  return getMemberInfoRef(currentUser.uid).set(memberInfo);
}

async function loadMemberInfoFromDb(uid) {
  const loadVersion = ++memberInfoLoadVersion;
  const memberRef = getMemberInfoRef(uid);

  try {
    const memberSnap = await memberRef.once('value');
    if (!currentUser || currentUser.uid !== uid || loadVersion !== memberInfoLoadVersion) return;

    const rawMemberInfo = memberSnap.val();
    const normalizedMemberInfo = normalizeMemberInfo(rawMemberInfo);
    memberInfo = normalizedMemberInfo;
    renderMemberInfoPanel();

    const needWriteBack = !memberSnap.exists() || JSON.stringify(rawMemberInfo) !== JSON.stringify(normalizedMemberInfo);
    if (needWriteBack) {
      await memberRef.set(normalizedMemberInfo);
    }
  } catch (err) {
    console.error('讀取 member_info 失敗', err);
  }
}

function saveTasksToDb() {
  if (!currentUser) return;
  getTaskListRef(currentUser.uid).set(tasks);
}

async function loadTasksFromDb(uid) {
  const loadVersion = ++tasksLoadVersion;
  const taskListRef = getTaskListRef(uid);

  try {
    const snapshot = await taskListRef.once('value');
    if (!currentUser || currentUser.uid !== uid || loadVersion !== tasksLoadVersion) return;

    const rawTasks = snapshot.val();
    const hasTaskList = Array.isArray(rawTasks) && rawTasks.length > 0;
    const normalizedTasks = hasTaskList ? normalizeTasks(rawTasks) : generateTasks();
    tasks = normalizedTasks;
    renderGrid();

    const needWriteBack = !hasTaskList || JSON.stringify(rawTasks) !== JSON.stringify(normalizedTasks);
    if (needWriteBack) {
      await taskListRef.set(normalizedTasks);
    }
  } catch (err) {
    console.error('讀取 task_list 失敗', err);
  }
}

// ===================== 渲染格子 =====================
function renderGrid() {
  if (!gridElement) return;
  ensureRenderableTasks();
  gridElement.innerHTML = '';

  tasks.forEach((task, idx) => {
    const cell = document.createElement('div');
    const doneClass = task.task_status ? ' completed' : '';
    cell.className = `task-cell level-${task.level}${doneClass}`;
    cell.style.setProperty('--i', String(idx));
    cell.dataset.id = task.task_id;
    if (task.task_status && task.task_completion_time) {
      const d = new Date(task.task_completion_time);
      cell.dataset.stampDate = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    } else if (task.task_status) {
      cell.dataset.stampDate = '已完成';
    }
    cell.textContent = task.code || `${task.level}${task.index}`;
    cell.addEventListener('click', () => openSidebar(task.task_id));
    gridElement.appendChild(cell);
  });
}

// ===================== Sidebar =====================
function openSidebar(taskId) {
  const task = tasks.find((t) => t.task_id === taskId);
  if (!task) return;

  taskDetails.innerHTML = '';
  if (sidebarTitle) sidebarTitle.textContent = '任務詳情';

  // Code
  const codeLi = document.createElement('li');
  codeLi.innerHTML = `<strong>編號：</strong>${task.code || `${task.level}${task.index}`}`;
  taskDetails.appendChild(codeLi);

  // Title
  const titleLi = document.createElement('li');
  titleLi.style.marginTop = '12px';
  titleLi.innerHTML = `<strong>標題</strong>`;
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.task_title;
  titleInput.placeholder = '輸入任務標題';
  titleInput.style.cssText = 'width:100%;padding:6px;margin-top:4px;border-radius:6px;border:1px solid #ccc;background:#fff;color:#1a2340;font-size:0.9rem;';
  titleInput.addEventListener('input', (e) => {
    task.task_title = e.target.value;
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
  doneCheckbox.checked = task.task_status;
  doneCheckbox.id = `doneCheck-${task.task_id}`;
  doneCheckbox.style.width = '16px';
  doneCheckbox.style.height = '16px';
  doneCheckbox.addEventListener('change', (e) => {
    task.task_status = e.target.checked;
    task.task_completion_time = task.task_status ? Date.now() : null;
    saveTasksToDb();
    renderGrid();
  });
  const doneCheckLabel = document.createElement('label');
  doneCheckLabel.htmlFor = `doneCheck-${task.task_id}`;
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

function openTaskListSidebar() {
  if (!taskDetails) return;
  ensureRenderableTasks();
  taskDetails.innerHTML = '';
  if (sidebarTitle) sidebarTitle.textContent = 'Task list';

  const sortedTasks = [...tasks].sort((a, b) => {
    const aOrder = TASK_LIST_ORDER.get(a.code) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = TASK_LIST_ORDER.get(b.code) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  sortedTasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = 'task-list-item';
    const taskTitle = task.task_title?.trim() || '未命名任務';
    item.innerHTML =
      `<div><strong>${task.code || `${task.level}${task.index}`}</strong> - ${taskTitle}</div>` +
      `<small>${task.task_status ? '已完成' : '未完成'}</small>`;
    item.addEventListener('click', () => openSidebar(task.task_id));
    taskDetails.appendChild(item);
  });

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
  closeUserMenu();
  loadMemberInfoFromDb(user.uid);
  renderGrid();
  loadTasksFromDb(user.uid);
}

function showLogin() {
  currentUser = null;
  memberInfo = null;
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (appDiv) appDiv.style.display = 'none';
  if (userInfo) userInfo.style.display = 'none';
  closeUserMenu();
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

if (userMenuButton) {
  userMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleUserMenu();
  });
}

if (memberSaveBtn) {
  memberSaveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return;
    if (!memberInfo) memberInfo = getDefaultMemberInfo();
    memberInfo.real_name = memberRealNameInput?.value || '';
    memberInfo.nick_name = memberNickNameInput?.value || '';
    memberInfo.address = memberAddressInput?.value || '';
    saveMemberInfoToDb().catch((err) => {
      console.error('儲存 member_info 失敗', err);
    });
  });
}

// ===================== 事件 =====================
menuButton?.addEventListener('click', () => {
  if (sidebar.classList.contains('open')) {
    closeSidebar();
    return;
  }
  openTaskListSidebar();
});
closeButton?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeSidebar();
  if (e.key === 'Escape' && !userMenuPanel?.classList.contains('hidden')) closeUserMenu();
});
document.addEventListener('click', (e) => {
  if (!userMenuPanel || !userMenuButton) return;
  const target = e.target;
  if (!(target instanceof Node)) return;
  if (!userMenuPanel.contains(target) && !userMenuButton.contains(target)) {
    closeUserMenu();
  }
});

renderGrid();
