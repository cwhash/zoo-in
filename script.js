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

function buildTasks() {
  const levelCounters = { S: 0, A: 0, B: 0, C: 0, N: 0 };
  const nextTasks = [];
  for (let cellNumber = 1; cellNumber <= GRID_SIZE * GRID_SIZE; cellNumber += 1) {
    const row = Math.floor((cellNumber - 1) / GRID_SIZE);
    const col = (cellNumber - 1) % GRID_SIZE;
    const level = getLevelByCell(cellNumber);
    levelCounters[level] += 1;
    const count = levelCounters[level];
    nextTasks.push({
      code: `${level}${count}`,
      row,
      col,
      level,
      title: `${level}${count} 任務`,
      description: `${level} 級任務（${levelLabel[level]}）`,
      completed: false,
      completedAt: '',
    });
  }
  return nextTasks;
}

let tasks = buildTasks();
let currentUid = null;

// ===================== Firebase DB =====================
function saveTaskToDB(task) {
  if (!currentUid) return;
  db.ref(`users/${currentUid}/tasks/${task.code}`).update({
    title: task.title,
    description: task.description,
    completed: task.completed,
    completedAt: task.completedAt,
  });
}

const debounceSave = {};
function saveTaskDebounced(task) {
  if (!currentUid) return;
  if (debounceSave[task.code]) clearTimeout(debounceSave[task.code]);
  debounceSave[task.code] = setTimeout(() => saveTaskToDB(task), 600);
}

function loadTasksFromDB(uid) {
  db.ref(`users/${uid}/tasks`).once('value').then((snapshot) => {
    const data = snapshot.val();
    if (data) {
      tasks.forEach((task) => {
        if (data[task.code]) {
          task.title = data[task.code].title ?? task.title;
          task.description = data[task.code].description ?? task.description;
          task.completed = data[task.code].completed ?? false;
          task.completedAt = data[task.code].completedAt ?? '';
        }
      });
    } else {
      // 首次登入，將預設任務寫入 DB
      tasks.forEach((task) => saveTaskToDB(task));
    }
    renderGrid();
    renderTaskDetails();
    updateDeadlineCountdown();
    setInterval(updateDeadlineCountdown, 1000);
  });
}

// ===================== Auth =====================
const loginScreen = document.getElementById('loginScreen');
const appDiv = document.getElementById('app');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const userInfo = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');
const signOutBtn = document.getElementById('signOutBtn');
const loginError = document.getElementById('loginError');

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUid = user.uid;
    loginScreen.classList.add('hidden');
    appDiv.style.display = '';
    userInfo.style.display = 'flex';
    userAvatar.src = user.photoURL || '';
    userAvatar.alt = user.displayName || '';
    setLoginError('');
    tasks = buildTasks();
    loadTasksFromDB(user.uid);
  } else {
    currentUid = null;
    loginScreen.classList.remove('hidden');
    appDiv.style.display = 'none';
    userInfo.style.display = 'none';
  }
});

function getFriendlyLoginError(error) {
  const messageMap = {
    'auth/unauthorized-domain': '目前網址不在 Firebase 授權網域，請將此網域加入 Authorized domains。',
    'auth/operation-not-allowed': 'Firebase 尚未啟用 Google 登入，請到 Firebase Console 開啟 Google Provider。',
    'auth/popup-blocked': '瀏覽器擋住了登入視窗，請允許彈出視窗後再試一次。',
    'auth/popup-closed-by-user': '登入視窗已被關閉，請重新嘗試登入。',
    'auth/cancelled-popup-request': '登入流程被中斷，請稍後再試。',
    'auth/invalid-action-code': '登入連結已失效（The requested action is invalid），請重新發起 Google 登入。',
    'auth/invalid-continue-uri': '登入網址設定有誤（continue URI），請檢查 Firebase Auth 設定。',
  };
  if (error?.code && messageMap[error.code]) return messageMap[error.code];
  return `登入失敗：${error?.message || '未知錯誤，請稍後再試。'}`;
}

function setLoginError(message = '') {
  if (!loginError) return;
  loginError.textContent = message;
}

async function startGoogleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  setLoginError('');

  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    setLoginError(getFriendlyLoginError(error));
    console.error('Google popup sign-in failed:', error);
  }
}

googleSignInBtn?.addEventListener('click', startGoogleSignIn);

signOutBtn?.addEventListener('click', () => auth.signOut());

// ===================== Render Grid =====================
function focusTaskDetail(index) {
  const detailItem = taskDetails.querySelector(`[data-task-index="${index}"]`);
  if (!detailItem) return;
  const details = detailItem.querySelector('details');
  if (details) details.open = true;
  detailItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderGrid() {
  gridElement.innerHTML = '';
  const fragment = document.createDocumentFragment();
  tasks.forEach((task, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `task-cell level-${task.level}${task.completed ? ' completed' : ''}`;
    if (task.completedAt) {
      cell.dataset.stampDate = task.completedAt;
    }
    cell.style.setProperty('--i', index + 1);
    cell.textContent = task.code;
    cell.setAttribute('aria-label', `${task.code}，${task.title}`);
    cell.addEventListener('click', () => {
      openSidebar();
      focusTaskDetail(index);
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
      const taskIndex = tasks.indexOf(task);
      const item = document.createElement('li');
      item.className = 'task-detail-item';
      item.dataset.taskIndex = String(taskIndex);

      const detail = document.createElement('details');
      detail.className = 'task-detail-expand';

      const summary = document.createElement('summary');
      summary.className = 'task-detail-head';

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
        task.completedAt = checkbox.checked ? formatStampDate(new Date()) : '';
        saveTaskToDB(task);
        renderGrid();
      });
      statusLabel.append(checkbox, document.createTextNode('完成'));

      summary.append(code, statusLabel);

      const body = document.createElement('div');
      body.className = 'task-detail-body';

      const titleLabel = document.createElement('label');
      titleLabel.className = 'task-field-label';
      titleLabel.textContent = '標題';
      const titleInput = document.createElement('input');
      titleInput.className = 'task-input';
      titleInput.type = 'text';
      titleInput.value = task.title;
      titleInput.addEventListener('input', () => {
        task.title = titleInput.value.trim() || `${task.code} 任務`;
        saveTaskDebounced(task);
        renderGrid();
      });
      titleLabel.appendChild(titleInput);

      const descriptionLabel = document.createElement('label');
      descriptionLabel.className = 'task-field-label';
      descriptionLabel.textContent = '內容';
      const descriptionInput = document.createElement('textarea');
      descriptionInput.className = 'task-textarea';
      descriptionInput.rows = 3;
      descriptionInput.value = task.description;
      descriptionInput.addEventListener('input', () => {
        task.description = descriptionInput.value.trim() || `${task.level} 級任務（${levelLabel[task.level]}）`;
        saveTaskDebounced(task);
      });
      descriptionLabel.appendChild(descriptionInput);

      body.append(titleLabel, descriptionLabel);
      detail.append(summary, body);
      item.append(detail);
      fragment.appendChild(item);
    });
  taskDetails.appendChild(fragment);
}

function formatStampDate(date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
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
