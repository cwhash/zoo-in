const LIFE_GRID_ACTIVITY_ID = 'life_grid_2027';
const N_TASKS = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10'];

const adminDom = {};
[
  'adminLogin',
  'adminSignInBtn',
  'adminLoginMessage',
  'adminApp',
  'adminSignOutBtn',
  'codeUsage',
  'nTaskEditor',
  'resetTaskForm',
  'resetUidInput',
  'resetTaskIdInput',
  'resetTaskBtn',
  'resetTaskMessage',
  'deleteUserDataForm',
  'deleteUidInput',
  'deleteUserDataBtn',
  'deleteUserDataMessage',
  'toast',
].forEach((id) => {
  adminDom[id] = document.getElementById(id);
});

let adminUser = null;
let adminRefs = [];

function setAdminMessage(element, text, isError = false) {
  if (!element) return;
  element.textContent = text || '';
  element.classList.toggle('error', Boolean(isError));
}

function showAdminToast(text) {
  adminDom.toast.textContent = text;
  adminDom.toast.classList.remove('hidden');
  setTimeout(() => adminDom.toast.classList.add('hidden'), 3500);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function detachAdminListeners() {
  adminRefs.forEach(({ ref, event, callback }) => ref.off(event, callback));
  adminRefs = [];
}

function listenAdmin(ref, event, callback) {
  ref.on(event, callback);
  adminRefs.push({ ref, event, callback });
}

async function isAdmin(uid) {
  const snapshot = await db.ref(`admins/${uid}`).once('value');
  return snapshot.val() === true;
}

function renderNTaskEditor(tasks = {}) {
  adminDom.nTaskEditor.innerHTML = '';
  N_TASKS.forEach((taskId) => {
    const task = tasks[taskId] || {};
    const item = document.createElement('article');
    item.className = 'admin-task-row';
    item.innerHTML = `
      <div>
        <h3>${taskId}</h3>
      </div>
      <label>
        <span>標題</span>
        <input id="title-${taskId}" type="text" maxlength="60" value="${escapeHtml(task.title || `官方任務 ${taskId}`)}" />
      </label>
      <label>
        <span>描述</span>
        <textarea id="desc-${taskId}" maxlength="300">${escapeHtml(task.description || '')}</textarea>
      </label>
      <button class="primary-btn" type="button">儲存 ${taskId}</button>
    `;
    item.querySelector('button').addEventListener('click', () => saveNTask(taskId));
    adminDom.nTaskEditor.appendChild(item);
  });
}

async function saveNTask(taskId) {
  const title = document.getElementById(`title-${taskId}`).value.trim();
  const description = document.getElementById(`desc-${taskId}`).value.trim();
  if (!title) {
    showAdminToast('N 任務標題必填。');
    return;
  }

  try {
    const callUpdate = functions.httpsCallable('adminUpdateNTask');
    await callUpdate({ taskId, title, description });
    showAdminToast(`${taskId} 已儲存。`);
  } catch (err) {
    console.error(err);
    showAdminToast(err?.message || '儲存失敗。');
  }
}

function attachAdminData() {
  detachAdminListeners();

  listenAdmin(db.ref(`activity_codes/${LIFE_GRID_ACTIVITY_ID}`), 'value', (snapshot) => {
    const code = snapshot.val() || {};
    const used = Number(code.used_count || 0);
    const max = Number(code.max_uses || 999);
    adminDom.codeUsage.textContent = `使用次數：${used} / ${max}`;
  });

  listenAdmin(db.ref(`activities/${LIFE_GRID_ACTIVITY_ID}/tasks`), 'value', (snapshot) => {
    renderNTaskEditor(snapshot.val() || {});
  });
}

async function loadAdmin(user) {
  adminUser = user;
  const allowed = await isAdmin(user.uid);
  if (!allowed) {
    await auth.signOut();
    setAdminMessage(adminDom.adminLoginMessage, '這個 Google 帳號沒有管理員權限。', true);
    return;
  }
  adminDom.adminLogin.classList.add('hidden');
  adminDom.adminApp.hidden = false;
  attachAdminData();
}

auth.onAuthStateChanged((user) => {
  if (user) {
    loadAdmin(user).catch((err) => {
      console.error(err);
      setAdminMessage(adminDom.adminLoginMessage, '載入管理員資料失敗。', true);
    });
    return;
  }

  adminUser = null;
  detachAdminListeners();
  adminDom.adminApp.hidden = true;
  adminDom.adminLogin.classList.remove('hidden');
});

adminDom.adminSignInBtn.addEventListener('click', async () => {
  setAdminMessage(adminDom.adminLoginMessage, '');
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (err) {
    console.error(err);
    setAdminMessage(adminDom.adminLoginMessage, err?.message || '登入失敗。', true);
  }
});

adminDom.adminSignOutBtn.addEventListener('click', () => auth.signOut());

adminDom.resetTaskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const uid = adminDom.resetUidInput.value.trim();
  const taskId = adminDom.resetTaskIdInput.value.trim().toUpperCase();
  if (!uid || !taskId) {
    setAdminMessage(adminDom.resetTaskMessage, '請填寫 UID 與任務代號。', true);
    return;
  }

  adminDom.resetTaskBtn.disabled = true;
  setAdminMessage(adminDom.resetTaskMessage, '處理中...');
  try {
    const callReset = functions.httpsCallable('adminResetTaskCompletion');
    await callReset({ uid, taskId });
    setAdminMessage(adminDom.resetTaskMessage, '已取消完成狀態，相關成就也會重新檢查。');
  } catch (err) {
    console.error(err);
    setAdminMessage(adminDom.resetTaskMessage, err?.message || '操作失敗。', true);
  } finally {
    adminDom.resetTaskBtn.disabled = false;
  }
});

adminDom.deleteUserDataForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const uid = adminDom.deleteUidInput.value.trim();
  if (!uid) {
    setAdminMessage(adminDom.deleteUserDataMessage, '請填寫會員 UID。', true);
    return;
  }

  const confirmed = window.confirm('確定刪除這位會員的 Zoo-In 資料、照片、動態與成就嗎？Firebase Auth 帳號不會刪除。');
  if (!confirmed) return;

  adminDom.deleteUserDataBtn.disabled = true;
  setAdminMessage(adminDom.deleteUserDataMessage, '刪除中...');
  try {
    const callDelete = functions.httpsCallable('adminDeleteUserData');
    await callDelete({ uid });
    setAdminMessage(adminDom.deleteUserDataMessage, '已刪除會員資料。');
  } catch (err) {
    console.error(err);
    setAdminMessage(adminDom.deleteUserDataMessage, err?.message || '刪除失敗。', true);
  } finally {
    adminDom.deleteUserDataBtn.disabled = false;
  }
});
