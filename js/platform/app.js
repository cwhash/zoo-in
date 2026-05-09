import { hashActivityCode } from '../shared/activity-codes.js';
import {
  GRID_SEQUENCE,
  LIFE_GRID_ACTIVITY_ID,
  LIFE_GRID_END_AT,
  LIFE_GRID_MAX_USES,
  LIFE_GRID_START_AT,
  TASK_LIST_SEQUENCE,
} from '../activities/life-grid/config.js';
import { completeLifeGridTask } from '../activities/life-grid/functions-adapter.js';

// ===================== Zoo-In Activity Config =====================
const OUTPUT_IMAGE_WIDTH = 1200;
const OUTPUT_IMAGE_HEIGHT = 1500;
const MAX_NICKNAME_LENGTH = 10;

const LEVEL_NAMES = {
  S: '傳奇',
  A: '挑戰',
  B: '進階',
  C: '基礎',
  N: '日常',
};

const FALLBACK_ACTIVITY_CONFIG = {
  activity_id: LIFE_GRID_ACTIVITY_ID,
  name: 'Life Grid 2027',
  type: 'life_grid',
  status: 'active',
  start_at: LIFE_GRID_START_AT,
  end_at: LIFE_GRID_END_AT,
  task_order: GRID_SEQUENCE,
  achievements: {
    first_task_completed: {
      title: '萬丈高樓平地起',
      description: '傳奇的開始！',
      hidden: true,
      condition: {
        type: 'completed_task_count',
        value: 1,
      },
    },
  },
  tasks: Object.fromEntries(TASK_LIST_SEQUENCE.map((taskId) => {
    const level = taskId[0];
    return [taskId, {
      task_id: taskId,
      level,
      index: Number(taskId.slice(1)),
      code: taskId,
      title: level === 'N' ? `官方任務 ${taskId}` : '',
      description: '',
      user_editable: level !== 'N',
    }];
  })),
};

// ===================== DOM =====================
const dom = {};
[
  'loginScreen',
  'loginError',
  'googleSignInBtn',
  'app',
  'pageTitle',
  'menuButton',
  'profileButton',
  'signOutBtn',
  'dashboardView',
  'lifeGridView',
  'googleAvatar',
  'profileGoogleAvatar',
  'googleName',
  'googleEmail',
  'nickNameInput',
  'realNameInput',
  'addressInput',
  'saveProfileBtn',
  'profileMessage',
  'unlockForm',
  'activityCodeInput',
  'unlockBtn',
  'unlockMessage',
  'activityCards',
  'emptyActivities',
  'activityPeriod',
  'completedCount',
  'deadlineCountdown',
  'taskGrid',
  'achievementCount',
  'achievementList',
  'emptyAchievements',
  'activityFeed',
  'emptyFeed',
  'navDrawer',
  'closeNavDrawerBtn',
  'homeNavBtn',
  'lifeGridNavBtn',
  'profileDrawer',
  'closeProfileDrawerBtn',
  'taskPanel',
  'taskPanelCode',
  'taskPanelTitle',
  'taskPanelBody',
  'closeTaskPanelBtn',
  'overlay',
  'toast',
].forEach((id) => {
  dom[id] = document.getElementById(id);
});

// ===================== State =====================
let currentUser = null;
let profile = null;
let activityUnlock = null;
let activityConfig = FALLBACK_ACTIVITY_CONFIG;
let userTasks = {};
let userAchievements = {};
let feedItems = [];
let feedIndex = 0;
let feedTimer = null;
let selectedTaskId = null;
let selectedImage = null;
let selectedImageUrl = null;
let cropState = { zoom: 1, x: 0, y: 0 };
let toastTimer = null;
let countdownTimer = null;
let signInPending = false;
const activeRefs = [];

// ===================== Helpers =====================
function now() {
  return Date.now();
}

function isLifeGridActive() {
  const time = now();
  const status = activityConfig?.status || 'active';
  return status === 'active' && time >= LIFE_GRID_START_AT && time < LIFE_GRID_END_AT;
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatFullDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeNickName(value) {
  const text = String(value || '').trim();
  if (!text) return '匿名';
  return Array.from(text).slice(0, MAX_NICKNAME_LENGTH).join('');
}

function sanitizeText(value, maxLength) {
  return Array.from(String(value || '').trim()).slice(0, maxLength).join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setMessage(element, text, isError = false) {
  if (!element) return;
  element.textContent = text || '';
  element.classList.toggle('error', Boolean(isError));
}

function showToast(message) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.add('hidden');
    toastTimer = null;
  }, 4200);
}

function getProfileRef(uid = currentUser?.uid) {
  return db.ref(`users/${uid}/profile`);
}

function getUnlockRef(uid = currentUser?.uid) {
  return db.ref(`users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`);
}

function getUserActivityRef(uid = currentUser?.uid) {
  return db.ref(`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}`);
}

function getUserTaskRef(taskId, uid = currentUser?.uid) {
  return db.ref(`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`);
}

function getUserAchievementsRef(uid = currentUser?.uid) {
  return db.ref(`users/${uid}/achievements/${LIFE_GRID_ACTIVITY_ID}`);
}

function detachListeners() {
  while (activeRefs.length > 0) {
    const item = activeRefs.pop();
    item.ref.off(item.event, item.callback);
  }
}

function listen(ref, event, callback) {
  ref.on(event, callback);
  activeRefs.push({ ref, event, callback });
}

function mergeActivityConfig(rawConfig) {
  const mergedTasks = {
    ...FALLBACK_ACTIVITY_CONFIG.tasks,
    ...(rawConfig?.tasks || {}),
  };
  return {
    ...FALLBACK_ACTIVITY_CONFIG,
    ...(rawConfig || {}),
    task_order: Array.isArray(rawConfig?.task_order) ? rawConfig.task_order : GRID_SEQUENCE,
    achievements: {
      ...FALLBACK_ACTIVITY_CONFIG.achievements,
      ...(rawConfig?.achievements || {}),
    },
    tasks: mergedTasks,
  };
}

function getTaskDefinition(taskId) {
  return activityConfig.tasks?.[taskId] || FALLBACK_ACTIVITY_CONFIG.tasks[taskId];
}

function getUserTask(taskId) {
  return userTasks?.[taskId] || {};
}

function isUserEditableTask(taskId) {
  return taskId[0] !== 'N';
}

function getTaskTitle(taskId) {
  const task = getUserTask(taskId);
  const def = getTaskDefinition(taskId);
  if (isUserEditableTask(taskId)) {
    return task.custom_title || `${taskId} 尚未填寫`;
  }
  return def?.title || `官方任務 ${taskId}`;
}

function getTaskDescription(taskId) {
  const task = getUserTask(taskId);
  const def = getTaskDefinition(taskId);
  return isUserEditableTask(taskId) ? task.custom_description || '' : def?.description || '';
}

function getCompletedTasks() {
  return TASK_LIST_SEQUENCE.filter((taskId) => getUserTask(taskId).status === 'completed');
}

function getDefaultProfile() {
  return {
    public: {
      nick_name: '匿名',
    },
    private: {
      real_name: '',
      address: '',
    },
    created_at: now(),
    updated_at: now(),
    schema_version: 1,
  };
}

function normalizeProfile(rawProfile) {
  const defaults = getDefaultProfile();
  return {
    ...defaults,
    ...(rawProfile || {}),
    public: {
      ...defaults.public,
      ...(rawProfile?.public || {}),
      nick_name: normalizeNickName(rawProfile?.public?.nick_name),
    },
    private: {
      ...defaults.private,
      ...(rawProfile?.private || {}),
      real_name: sanitizeText(rawProfile?.private?.real_name, 60),
      address: sanitizeText(rawProfile?.private?.address, 120),
    },
  };
}

// ===================== Rendering =====================
function renderAccount() {
  if (!currentUser) return;
  if (dom.googleAvatar) {
    dom.googleAvatar.src = currentUser.photoURL || '';
    dom.googleAvatar.alt = currentUser.displayName || 'Google 帳號';
  }
  if (dom.profileGoogleAvatar) {
    dom.profileGoogleAvatar.src = currentUser.photoURL || '';
    dom.profileGoogleAvatar.alt = currentUser.displayName || 'Google 帳號';
  }
  if (dom.googleName) dom.googleName.textContent = currentUser.displayName || '未提供姓名';
  if (dom.googleEmail) dom.googleEmail.textContent = currentUser.email || '未提供 email';
  if (dom.nickNameInput) dom.nickNameInput.value = profile?.public?.nick_name || '匿名';
  if (dom.realNameInput) dom.realNameInput.value = profile?.private?.real_name || '';
  if (dom.addressInput) dom.addressInput.value = profile?.private?.address || '';
}

function renderDashboard() {
  const hasUnlock = Boolean(activityUnlock?.unlocked_at);
  dom.activityCards.innerHTML = '';
  dom.emptyActivities.classList.toggle('hidden', hasUnlock);
  dom.lifeGridNavBtn?.classList.toggle('hidden', !hasUnlock);

  if (hasUnlock) {
    const completed = getCompletedTasks().length;
    const achievements = Object.keys(userAchievements || {}).length;
    const card = document.createElement('article');
    card.className = 'activity-card';
    card.innerHTML = `
      <div>
        <p class="eyebrow">進行中</p>
        <h3>Life Grid 2027</h3>
        <p class="muted-text">已完成 ${completed} / 25，已解鎖 ${achievements} 個成就</p>
      </div>
      <div class="activity-card-footer">
        <span class="small-pill">${completed}/25</span>
        <button class="primary-btn" type="button">進入活動</button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', showLifeGrid);
    dom.activityCards.appendChild(card);
  }
}

function renderLifeGrid() {
  renderProgress();
  renderGrid();
  renderAchievements();
  renderFeed();
}

function renderProgress() {
  const completed = getCompletedTasks().length;
  if (dom.completedCount) dom.completedCount.textContent = `${completed} / 25`;
  if (dom.activityPeriod) dom.activityPeriod.textContent = '2026/07/01 - 2027/12/31';
}

function renderGrid() {
  if (!dom.taskGrid) return;
  dom.taskGrid.innerHTML = '';

  GRID_SEQUENCE.forEach((taskId) => {
    const def = getTaskDefinition(taskId);
    const task = getUserTask(taskId);
    const level = def?.level || taskId[0];
    const isCompleted = task.status === 'completed';
    const isLocked = Boolean(task.locked_at) || !isUserEditableTask(taskId);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `task-cell level-${level}${isCompleted ? ' completed' : ''}${isLocked ? ' locked' : ''}`;
    cell.textContent = taskId;
    cell.setAttribute('aria-label', `${taskId} ${getTaskTitle(taskId)}`);
    if (isCompleted) {
      cell.dataset.completedDate = formatFullDate(task.completed_at);
    }
    cell.addEventListener('click', () => openTaskPanel(taskId));
    dom.taskGrid.appendChild(cell);
  });
}

function renderAchievements() {
  const entries = Object.entries(userAchievements || {})
    .sort(([, a], [, b]) => (b.earned_at || 0) - (a.earned_at || 0));

  dom.achievementList.innerHTML = '';
  dom.emptyAchievements.classList.toggle('hidden', entries.length > 0);
  if (dom.achievementCount) dom.achievementCount.textContent = String(entries.length);

  entries.forEach(([achievementId, earned]) => {
    const def = activityConfig.achievements?.[achievementId] || {};
    const item = document.createElement('article');
    item.className = 'achievement-item';
    item.innerHTML = `
      <h3>${escapeHtml(earned.title || def.title || achievementId)}</h3>
      <p class="muted-text">${escapeHtml(earned.description || def.description || '')}</p>
      <p class="muted-text">${formatFullDate(earned.earned_at)} 解鎖</p>
    `;
    dom.achievementList.appendChild(item);
  });
}

function formatFeedItem(item) {
  const date = formatDate(item.created_at);
  const nickName = item.nick_name || '匿名';
  if (item.type === 'achievement_unlocked') {
    return `${date} ${nickName}解鎖成就${item.achievement_title || ''}`;
  }
  return `${date} ${nickName}完成任務${item.task_title || item.task_id || ''}`;
}

function renderFeed() {
  if (!dom.activityFeed) return;
  dom.activityFeed.innerHTML = '';
  dom.emptyFeed.classList.toggle('hidden', feedItems.length > 0);
  if (feedTimer) clearInterval(feedTimer);

  if (feedItems.length === 0) return;
  feedIndex = Math.min(feedIndex, feedItems.length - 1);

  const draw = () => {
    const item = feedItems[feedIndex % feedItems.length];
    dom.activityFeed.innerHTML = '';
    const feedNode = document.createElement('article');
    feedNode.className = 'feed-item';
    feedNode.innerHTML = `<p>${escapeHtml(formatFeedItem(item))}</p>`;
    dom.activityFeed.appendChild(feedNode);
    feedIndex = (feedIndex + 1) % feedItems.length;
  };

  draw();
  feedTimer = setInterval(draw, 4000);
  dom.activityFeed.onmouseenter = () => clearInterval(feedTimer);
  dom.activityFeed.onmouseleave = () => {
    if (feedTimer) clearInterval(feedTimer);
    feedTimer = setInterval(draw, 4000);
  };
}

function showDashboard() {
  dom.pageTitle.textContent = 'ZOO-IN';
  dom.dashboardView.classList.remove('hidden');
  dom.lifeGridView.classList.add('hidden');
  closeChromeDrawers();
  closeTaskPanel();
  renderDashboard();
}

function showLifeGrid() {
  dom.pageTitle.textContent = 'Life Grid 2027';
  dom.dashboardView.classList.add('hidden');
  dom.lifeGridView.classList.remove('hidden');
  closeChromeDrawers();
  renderLifeGrid();
}

function showLogin() {
  currentUser = null;
  profile = null;
  activityUnlock = null;
  userTasks = {};
  userAchievements = {};
  feedItems = [];
  detachListeners();
  if (feedTimer) clearInterval(feedTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  dom.app.hidden = true;
  dom.loginScreen.classList.remove('hidden');
  closeChromeDrawers();
  closeTaskPanel();
}

function showApp() {
  dom.loginScreen.classList.add('hidden');
  dom.app.hidden = false;
  startCountdown();
  renderAccount();
  showDashboard();
}

function openNavDrawer() {
  dom.navDrawer?.classList.add('open');
  dom.navDrawer?.setAttribute('aria-hidden', 'false');
  dom.menuButton?.setAttribute('aria-expanded', 'true');
  dom.overlay?.classList.remove('hidden');
}

function openProfileDrawer() {
  renderAccount();
  dom.profileDrawer?.classList.add('open');
  dom.profileDrawer?.setAttribute('aria-hidden', 'false');
  dom.profileButton?.setAttribute('aria-expanded', 'true');
  dom.overlay?.classList.remove('hidden');
}

function closeChromeDrawers() {
  dom.navDrawer?.classList.remove('open');
  dom.navDrawer?.setAttribute('aria-hidden', 'true');
  dom.menuButton?.setAttribute('aria-expanded', 'false');
  dom.profileDrawer?.classList.remove('open');
  dom.profileDrawer?.setAttribute('aria-hidden', 'true');
  dom.profileButton?.setAttribute('aria-expanded', 'false');
  if (!dom.taskPanel?.classList.contains('open')) {
    dom.overlay?.classList.add('hidden');
  }
}

// ===================== Data Loading =====================
async function ensureProfile() {
  const snapshot = await getProfileRef().once('value');
  profile = normalizeProfile(snapshot.val());
  if (!snapshot.exists()) {
    await getProfileRef().set(profile);
  } else if (JSON.stringify(snapshot.val()) !== JSON.stringify(profile)) {
    profile.updated_at = now();
    await getProfileRef().set(profile);
  }
  renderAccount();
}

function attachDataListeners() {
  detachListeners();

  listen(db.ref(`activities/${LIFE_GRID_ACTIVITY_ID}`), 'value', (snapshot) => {
    activityConfig = mergeActivityConfig(snapshot.val());
    renderDashboard();
    renderLifeGrid();
  });

  listen(getUnlockRef(), 'value', (snapshot) => {
    activityUnlock = snapshot.val();
    renderDashboard();
  });

  listen(getUserActivityRef().child('tasks'), 'value', (snapshot) => {
    userTasks = snapshot.val() || {};
    renderDashboard();
    renderLifeGrid();
  });

  listen(getUserAchievementsRef(), 'value', (snapshot) => {
    userAchievements = snapshot.val() || {};
    renderDashboard();
    renderAchievements();
  });

  const feedQuery = db.ref(`activity_feeds/${LIFE_GRID_ACTIVITY_ID}`)
    .orderByChild('created_at')
    .limitToLast(10);
  listen(feedQuery, 'value', (snapshot) => {
    const raw = snapshot.val() || {};
    feedItems = Object.values(raw).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    feedIndex = 0;
    renderFeed();
  });
}

async function loadUser(user) {
  currentUser = user;
  await ensureProfile();
  attachDataListeners();
  showApp();
}

// ===================== Actions =====================
async function saveProfile() {
  if (!currentUser) return;
  const nextProfile = normalizeProfile({
    ...profile,
    public: {
      nick_name: dom.nickNameInput.value,
    },
    private: {
      real_name: dom.realNameInput.value,
      address: dom.addressInput.value,
    },
    updated_at: now(),
    schema_version: 1,
  });

  dom.saveProfileBtn.disabled = true;
  setMessage(dom.profileMessage, '儲存中...');
  try {
    await getProfileRef().set(nextProfile);
    profile = nextProfile;
    renderAccount();
    setMessage(dom.profileMessage, '已儲存。');
  } catch (err) {
    console.error(err);
    setMessage(dom.profileMessage, '儲存失敗，請稍後再試。', true);
  } finally {
    dom.saveProfileBtn.disabled = false;
  }
}

async function unlockActivity(event) {
  event.preventDefault();
  if (!currentUser) return;

  const code = dom.activityCodeInput.value.trim();
  if (!code) {
    setMessage(dom.unlockMessage, '請輸入活動代碼。', true);
    return;
  }

  dom.unlockBtn.disabled = true;
  setMessage(dom.unlockMessage, '驗證活動代碼中...');
  try {
    if (activityUnlock?.unlocked_at) {
      throw new Error('Activity already unlocked.');
    }

    const submittedHash = await hashActivityCode(code);
    const codeRef = db.ref(`activity_code_hashes/${submittedHash}`);
    const codeSnapshot = await codeRef.once('value');
    const codeConfig = codeSnapshot.val() || {};
    const activityHash = String(codeConfig.code_hash || submittedHash);
    const used = Number(codeConfig.used_count || 0);
    const max = Number(codeConfig.max_uses || LIFE_GRID_MAX_USES);
    if (!codeSnapshot.exists() || codeConfig.active === false || codeConfig.activity_id !== LIFE_GRID_ACTIVITY_ID) {
      throw new Error('活動代碼尚未設定。');
    }
    if (submittedHash !== activityHash) {
      throw new Error('活動代碼不正確。');
    }
    if (used >= max) {
      throw new Error('活動名額已滿。');
    }

    const name = activityConfig?.name || 'Life Grid 2027';
    const time = now();
    const usageResult = await codeRef.child('used_count').transaction((current) => {
      const count = Number(current || 0);
      if (count >= max) return;
      return count + 1;
    });
    if (!usageResult.committed) {
      throw new Error('活動名額已滿。');
    }
    await getUnlockRef().set({
      activity_id: LIFE_GRID_ACTIVITY_ID,
      unlocked_at: time,
      code_hash: activityHash,
    });
    await db.ref(`activity_join_counters/${LIFE_GRID_ACTIVITY_ID}`).transaction((current) => {
      const counter = current || {};
      return {
        activity_id: LIFE_GRID_ACTIVITY_ID,
        joined_count: Number(counter.joined_count || 0) + 1,
        updated_at: time,
      };
    });
    await getUserActivityRef().update({
      joined_at: time,
      updated_at: time,
    });
    dom.activityCodeInput.value = '';
    setMessage(dom.unlockMessage, `已解鎖 ${name}。`);
    showToast(`已解鎖 ${name}`);
  } catch (err) {
    console.error(err);
    const message = err?.message || '解鎖失敗，請稍後再試。';
    setMessage(dom.unlockMessage, message, true);
  } finally {
    dom.unlockBtn.disabled = false;
  }
}

async function saveTaskPlan(taskId) {
  if (!currentUser || !activityUnlock?.unlocked_at) return;
  if (!isLifeGridActive()) {
    showToast('活動已結束，目前只能查看紀錄。');
    return;
  }

  const titleInput = document.getElementById('taskTitleInput');
  const descriptionInput = document.getElementById('taskDescriptionInput');
  const title = sanitizeText(titleInput?.value, 50);
  const description = sanitizeText(descriptionInput?.value, 300);

  if (!title) {
    showToast('請先填寫任務標題。');
    return;
  }

  const currentTask = getUserTask(taskId);
  if (currentTask.locked_at || currentTask.status === 'completed') {
    showToast('任務內容已鎖定，如需修改請向管理員申請。');
    return;
  }

  const updates = {
    task_id: taskId,
    level: taskId[0],
    custom_title: title,
    custom_description: description,
    status: currentTask.status || 'open',
    locked_at: now(),
    updated_at: now(),
  };

  try {
    await getUserTaskRef(taskId).update(updates);
    showToast('任務內容已鎖定。');
    openTaskPanel(taskId);
  } catch (err) {
    console.error(err);
    showToast('儲存任務失敗。');
  }
}

async function completeTask(taskId) {
  if (!currentUser || !activityUnlock?.unlocked_at) return;
  if (!isLifeGridActive()) {
    showToast('活動已結束，目前只能查看紀錄。');
    return;
  }

  const task = getUserTask(taskId);
  if (task.status === 'completed') return;
  if (isUserEditableTask(taskId) && !task.locked_at) {
    showToast('請先填寫並鎖定任務內容。');
    return;
  }
  if (!selectedImage) {
    showToast('完成任務需要上傳一張 4:5 照片。');
    return;
  }

  const completeBtn = document.getElementById('completeTaskBtn');
  if (completeBtn) completeBtn.disabled = true;

  try {
    const imageBlob = await createCroppedBlob();
    if (imageBlob.size > 3 * 1024 * 1024) {
      showToast('照片壓縮後仍超過 3MB，請換一張較小的照片。');
      return;
    }

    const imagePath = `submissions/${LIFE_GRID_ACTIVITY_ID}/${currentUser.uid}/${taskId}.jpg`;
    await storage.ref(imagePath).put(imageBlob, {
      contentType: 'image/jpeg',
      customMetadata: {
        activity_id: LIFE_GRID_ACTIVITY_ID,
        task_id: taskId,
      },
    });

    const result = await completeLifeGridTask({ taskId, imagePath });

    const unlockedAchievements = result?.data?.unlockedAchievements || [];
    showToast('任務已完成。');
    unlockedAchievements.forEach((achievement) => {
      showToast(`解鎖成就：${achievement.title}`);
    });
    closeTaskPanel();
  } catch (err) {
    console.error(err);
    showToast(err?.message || '完成任務失敗，請稍後再試。');
  } finally {
    if (completeBtn) completeBtn.disabled = false;
  }
}

// ===================== Task Panel =====================
function openTaskPanel(taskId) {
  selectedTaskId = taskId;
  resetCropState();

  const def = getTaskDefinition(taskId);
  const task = getUserTask(taskId);
  const editable = isUserEditableTask(taskId);
  const completed = task.status === 'completed';
  const locked = Boolean(task.locked_at);
  const title = getTaskTitle(taskId);
  const description = getTaskDescription(taskId);

  dom.taskPanelCode.textContent = `${taskId} · ${LEVEL_NAMES[taskId[0]]}`;
  dom.taskPanelTitle.textContent = title;
  dom.taskPanelBody.innerHTML = '';

  const status = document.createElement('div');
  status.className = 'task-status';
  status.textContent = completed
    ? `已完成：${formatFullDate(task.completed_at)}`
    : (!isLifeGridActive() ? '活動已結束，只能查看。' : '尚未完成');
  dom.taskPanelBody.appendChild(status);

  if (editable && !locked && !completed) {
    dom.taskPanelBody.appendChild(createEditableTaskFields(taskId));
  } else {
    const detail = document.createElement('div');
    detail.className = 'task-status';
    detail.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description || '尚無描述。')}</p>
      ${editable ? '<p>任務內容已鎖定，如需修改請向管理員申請。</p>' : ''}
    `;
    dom.taskPanelBody.appendChild(detail);
  }

  if (completed) {
    renderCompletedPhoto(task.image_path);
  } else if (activityUnlock?.unlocked_at && isLifeGridActive()) {
    const canComplete = !editable || locked;
    dom.taskPanelBody.appendChild(createCompletionUploader(taskId, canComplete));
  }

  dom.taskPanel.classList.add('open');
  dom.taskPanel.setAttribute('aria-hidden', 'false');
  dom.overlay.classList.remove('hidden');
}

function createEditableTaskFields(taskId) {
  const container = document.createElement('section');
  container.className = 'profile-form';
  container.innerHTML = `
    <label class="task-field">
      <span>任務標題</span>
      <input id="taskTitleInput" type="text" maxlength="50" value="${escapeHtml(getTaskTitle(taskId).startsWith(taskId) ? '' : getTaskTitle(taskId))}" />
    </label>
    <label class="task-field">
      <span>任務描述</span>
      <textarea id="taskDescriptionInput" maxlength="300">${escapeHtml(getTaskDescription(taskId))}</textarea>
    </label>
    <button id="lockTaskBtn" class="primary-btn" type="button">填寫完成並鎖定</button>
  `;
  container.querySelector('#lockTaskBtn').addEventListener('click', () => saveTaskPlan(taskId));
  return container;
}

function createCompletionUploader(taskId, canComplete) {
  const container = document.createElement('section');
  container.className = 'cropper';
  container.innerHTML = `
    <label class="task-field">
      <span>完成照片，僅本人與管理員可見</span>
      <input id="taskPhotoInput" type="file" accept="image/*" ${canComplete ? '' : 'disabled'} />
    </label>
    <div id="cropTool" class="cropper hidden">
      <div class="crop-frame">
        <img id="cropImage" alt="" />
      </div>
      <div class="crop-controls">
        <label>縮放 <input id="cropZoom" type="range" min="1" max="2.4" step="0.01" value="1" /></label>
        <label>左右 <input id="cropX" type="range" min="-100" max="100" step="1" value="0" /></label>
        <label>上下 <input id="cropY" type="range" min="-100" max="100" step="1" value="0" /></label>
      </div>
    </div>
    <button id="completeTaskBtn" class="primary-btn" type="button" ${canComplete ? '' : 'disabled'}>完成任務</button>
    ${canComplete ? '' : '<p class="muted-text">請先填寫並鎖定任務內容。</p>'}
  `;

  container.querySelector('#taskPhotoInput').addEventListener('change', handlePhotoSelection);
  container.querySelector('#completeTaskBtn').addEventListener('click', () => completeTask(taskId));
  return container;
}

async function renderCompletedPhoto(imagePath) {
  if (!imagePath) return;
  const container = document.createElement('div');
  container.className = 'task-status';
  container.textContent = '照片載入中...';
  dom.taskPanelBody.appendChild(container);
  try {
    const url = await storage.ref(imagePath).getDownloadURL();
    container.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'completed-photo';
    img.src = url;
    img.alt = '完成任務照片';
    container.appendChild(img);
  } catch (err) {
    console.warn(err);
    container.textContent = '照片目前無法載入。';
  }
}

function closeTaskPanel() {
  resetCropState();
  selectedTaskId = null;
  dom.taskPanel?.classList.remove('open');
  dom.taskPanel?.setAttribute('aria-hidden', 'true');
  if (!dom.navDrawer?.classList.contains('open') && !dom.profileDrawer?.classList.contains('open')) {
    dom.overlay?.classList.add('hidden');
  }
}

// ===================== Image Crop =====================
function resetCropState() {
  selectedImage = null;
  cropState = { zoom: 1, x: 0, y: 0 };
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = null;
}

function handlePhotoSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  resetCropState();

  selectedImageUrl = URL.createObjectURL(file);
  selectedImage = new Image();
  selectedImage.onload = () => {
    const cropTool = document.getElementById('cropTool');
    const cropImage = document.getElementById('cropImage');
    if (!cropTool || !cropImage) return;
    cropImage.src = selectedImageUrl;
    cropTool.classList.remove('hidden');
    setupCropControls();
    renderCropPreview();
  };
  selectedImage.src = selectedImageUrl;
}

function setupCropControls() {
  [
    ['cropZoom', 'zoom'],
    ['cropX', 'x'],
    ['cropY', 'y'],
  ].forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', () => {
      cropState[key] = Number(input.value);
      renderCropPreview();
    });
  });
}

function renderCropPreview() {
  const frame = document.querySelector('.crop-frame');
  const image = document.getElementById('cropImage');
  if (!frame || !image || !selectedImage) return;

  const frameRect = frame.getBoundingClientRect();
  const baseScale = Math.max(
    frameRect.width / selectedImage.naturalWidth,
    frameRect.height / selectedImage.naturalHeight,
  ) * cropState.zoom;
  const displayWidth = selectedImage.naturalWidth * baseScale;
  const displayHeight = selectedImage.naturalHeight * baseScale;
  const maxX = Math.max(0, (displayWidth - frameRect.width) / 2);
  const maxY = Math.max(0, (displayHeight - frameRect.height) / 2);

  image.style.width = `${displayWidth}px`;
  image.style.height = `${displayHeight}px`;
  image.style.transform = `translate(calc(-50% + ${(cropState.x / 100) * maxX}px), calc(-50% + ${(cropState.y / 100) * maxY}px))`;
}

function createCroppedBlob() {
  return new Promise((resolve, reject) => {
    if (!selectedImage) {
      reject(new Error('No image selected'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_IMAGE_WIDTH;
    canvas.height = OUTPUT_IMAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    const sourceScale = Math.max(
      OUTPUT_IMAGE_WIDTH / selectedImage.naturalWidth,
      OUTPUT_IMAGE_HEIGHT / selectedImage.naturalHeight,
    ) * cropState.zoom;
    const sourceWidth = OUTPUT_IMAGE_WIDTH / sourceScale;
    const sourceHeight = OUTPUT_IMAGE_HEIGHT / sourceScale;
    const rangeX = Math.max(0, (selectedImage.naturalWidth - sourceWidth) / 2);
    const rangeY = Math.max(0, (selectedImage.naturalHeight - sourceHeight) / 2);
    const centerX = selectedImage.naturalWidth / 2 - (cropState.x / 100) * rangeX;
    const centerY = selectedImage.naturalHeight / 2 - (cropState.y / 100) * rangeY;
    const sx = Math.max(0, Math.min(selectedImage.naturalWidth - sourceWidth, centerX - sourceWidth / 2));
    const sy = Math.max(0, Math.min(selectedImage.naturalHeight - sourceHeight, centerY - sourceHeight / 2));

    ctx.drawImage(
      selectedImage,
      sx,
      sy,
      sourceWidth,
      sourceHeight,
      0,
      0,
      OUTPUT_IMAGE_WIDTH,
      OUTPUT_IMAGE_HEIGHT,
    );
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Image export failed'));
    }, 'image/jpeg', 0.85);
  });
}

// ===================== Countdown =====================
function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  const draw = () => {
    if (!dom.deadlineCountdown) return;
    const diff = LIFE_GRID_END_AT - now();
    if (diff <= 0) {
      dom.deadlineCountdown.textContent = '活動已結束，只能查看紀錄。';
      return;
    }
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    dom.deadlineCountdown.textContent = `${days} 天 ${hours} 小時 ${minutes} 分 ${seconds} 秒`;
  };
  draw();
  countdownTimer = setInterval(draw, 1000);
}

// ===================== Events =====================
auth.onAuthStateChanged((user) => {
  if (user) {
    loadUser(user).catch((err) => {
      console.error(err);
      showToast('載入會員資料失敗。');
    });
  } else {
    showLogin();
  }
});

dom.googleSignInBtn?.addEventListener('click', async () => {
  if (signInPending) return;
  signInPending = true;
  dom.googleSignInBtn.disabled = true;
  setMessage(dom.loginError, '');
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    signInPending = false;
    dom.googleSignInBtn.disabled = false;
  } catch (err) {
    console.error(err);
    signInPending = false;
    dom.googleSignInBtn.disabled = false;
    setMessage(dom.loginError, err?.message || '登入失敗。', true);
  }
});

dom.signOutBtn?.addEventListener('click', () => auth.signOut());
dom.menuButton?.addEventListener('click', openNavDrawer);
dom.profileButton?.addEventListener('click', openProfileDrawer);
dom.closeNavDrawerBtn?.addEventListener('click', closeChromeDrawers);
dom.closeProfileDrawerBtn?.addEventListener('click', closeChromeDrawers);
dom.homeNavBtn?.addEventListener('click', showDashboard);
dom.lifeGridNavBtn?.addEventListener('click', () => {
  if (activityUnlock?.unlocked_at) {
    showLifeGrid();
    return;
  }
  closeChromeDrawers();
  showToast('請先輸入活動代碼解鎖 Life Grid。');
});
dom.saveProfileBtn?.addEventListener('click', saveProfile);
dom.unlockForm?.addEventListener('submit', unlockActivity);
dom.closeTaskPanelBtn?.addEventListener('click', closeTaskPanel);
dom.overlay?.addEventListener('click', () => {
  closeTaskPanel();
  closeChromeDrawers();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeTaskPanel();
    closeChromeDrawers();
  }
});
