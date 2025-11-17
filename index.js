const defaultConfig = {
  dashboard_title: 'سیستم مدیریت موتور سکیل ها',
  company_name: 'پارکینگ مرکزی',
  primary_color: '#667eea',
  secondary_color: '#11998e',
  text_color: '#1f2937',
  background_color: '#f9fafb',
  card_color: '#ffffff'
};
let allData = [];
let allUsers = []; 
let currentRecordCount = 0;
let currentPasswordType = '';
let currentStatusFilter = 'all';
let departments = []; 
let currentUserRole = ''; 
let historySearchTerm = '';
let historyFromDate = '';
let historyToDate = '';
const JalaliDate = {
  g_days_in_month: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  j_days_in_month: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
};
JalaliDate.jalaliToGregorian = function(j_y, j_m, j_d) {
  j_y = parseInt(j_y);
  j_m = parseInt(j_m);
  j_d = parseInt(j_d);
  var jy = j_y - 979;
  var jm = j_m - 1;
  var jd = j_d - 1;
  var j_day_no = 365 * jy + parseInt(jy / 33) * 8 + parseInt((jy % 33 + 3) / 4);
  for (var i = 0; i < jm; ++i) j_day_no += JalaliDate.j_days_in_month[i];
  j_day_no += jd;
  var g_day_no = j_day_no + 79;
  var gy = 1600 + 400 * parseInt(g_day_no / 146097);
  g_day_no = g_day_no % 146097;
  var leap = true;
  if (g_day_no >= 36525) 
  {
    g_day_no--;
    gy += 100 * parseInt(g_day_no / 36524); 
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) g_day_no++;
    else leap = false;
  }
  gy += 4 * parseInt(g_day_no / 1461); 
  g_day_no %= 1461;
  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += parseInt(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }
  for (var i = 0; g_day_no >= JalaliDate.g_days_in_month[i] + (i == 1 && leap); i++)
    g_day_no -= JalaliDate.g_days_in_month[i] + (i == 1 && leap);
  var gm = i + 1;
  var gd = g_day_no + 1;
  gm = gm < 10 ? "0" + gm : gm;
  gd = gd < 10 ? "0" + gd : gd;
  return [gy, gm, gd];
};
const dataStorageKey = 'motorcycleManagementData'; 
const usersStorageKey = 'userAccountsData'; 
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
async function loadData() {
  try {
    const stored = localStorage.getItem(dataStorageKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
    return [];
  }
}
async function saveData(data) {
  try {
    localStorage.setItem(dataStorageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    showToast('خطا در ذخیره داده‌ها', '❌');
  }
}
async function loadUsers() {
  try {
    const stored = localStorage.getItem(usersStorageKey);
    allUsers = stored ? JSON.parse(stored) : [];
    if (allUsers.length === 0) {
      const defaultAdmin = {
        __backendId: generateId(),
        fullName: 'شهاب حمیدی',
        username: 'shahab',
        password: 'em',
        role: 'admin'
      };
      allUsers.push(defaultAdmin);
      await saveUsers();
    }
    const syncSuccess = await syncUsersWithGoogleSheets();
    if (!syncSuccess) {
      showToast('هشدار: همگام‌سازی اکانت‌ها با Google Sheets ناموفق بود', '⚠️');
    }
    return allUsers;
  } catch (error) {
    console.error('Error loading users from localStorage:', error);
    return [];
  }
}
async function saveUsers(users) {
  try {
    localStorage.setItem(usersStorageKey, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users from localStorage:', error);
    showToast('خطا در ذخیره کاربران', '❌');
  }
}
async function createUser(userData) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ایجاد اکانت ندارید', '⚠️');
    return { isOk: false };
  }
  if (allUsers.find(u => u.username === userData.username)) {
    showToast('نام کاربری تکراری است', '⚠️');
    return { isOk: false };
  }
  userData.__backendId = generateId();
  allUsers.push(userData);
  await saveUsers(allUsers);
  const gsData = mapUserToGS(userData);
  const gsResult = await callGoogleSheets('create', 'accounts', gsData);
  if (!gsResult.success) {
    showToast('خطا در ذخیره اکانت در Google Sheets', '❌');
    allUsers.pop();
    await saveUsers(allUsers);
    return { isOk: false };
  }
  if (getCurrentPage() === 'accounts') {
    renderAccounts();
  }
  return { isOk: true };
}
async function deleteUser(userId) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به حذف اکانت ندارید', '⚠️');
    return { isOk: false };
  }
  const user = allUsers.find(u => u.__backendId === userId);
  if (!user || user.username === 'shahab') {
    showToast('نمی‌توان اکانت شهاب حمیدی را حذف کرد', '⚠️');
    return { isOk: false };
  }
  const gsResult = await callGoogleSheets('delete', 'accounts', { __backendId: userId });
  if (!gsResult.success) {
    showToast('خطا در حذف اکانت از Google Sheets', '❌');
    return { isOk: false };
  }
  const index = allUsers.findIndex(u => u.__backendId === userId);
  allUsers.splice(index, 1);
  await saveUsers(allUsers);
  if (getCurrentPage() === 'accounts') {
    renderAccounts();
  }
  return { isOk: true };
}
async function updateUserRole(userId, newRole) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ویرایش نقش اکانت ندارید', '⚠️');
    return { isOk: false };
  }
  const user = allUsers.find(u => u.__backendId === userId);
  if (!user) return { isOk: false };
  user.role = newRole;
  await saveUsers(allUsers);
  const gsData = mapUserToGS(user);
  const gsResult = await callGoogleSheets('update', 'accounts', gsData);
  if (!gsResult.success) {
    showToast('خطا در به‌روزرسانی اکانت در Google Sheets', '❌');
    user.role = user.role === 'admin' ? 'admin' : 'user'; 
    await saveUsers(allUsers);
    return { isOk: false };
  }
  if (getCurrentPage() === 'accounts') {
    renderAccounts();
  }
  return { isOk: true };
}
async function syncUsersWithGoogleSheets() {
  try {
    const result = await callGoogleSheets('readAll', 'accounts');
    if (result.success) {
      const gsUsers = result.data
        .map(mapGSToUser)
        .filter(user => user.__backendId); 
      const defaultAdminExists = gsUsers.some(u => u.username === 'admin');
      if (!defaultAdminExists) {
        const defaultAdmin = {
          __backendId: generateId(),
          fullName: 'شهاب حمیدی',
          username: 'shahab',
          password: 'em',
          role: 'admin'
        };
        gsUsers.push(defaultAdmin);
      }
      allUsers = gsUsers;
      await saveUsers(allUsers); 
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error syncing users:', error);
    return false;
  }
}
window.dataSdk = {
  init: async (handler) => {
    allData = await loadData();
    const employeeSyncSuccess = await syncEmployeesWithGoogleSheets(allData);
    if (!employeeSyncSuccess) {
      showToast('هشدار: همگام‌سازی کارمندان با Google Sheets ناموفق بود', '⚠️');
    }
    const motorcycleSyncSuccess = await syncMotorcyclesWithGoogleSheets(allData);
    if (!motorcycleSyncSuccess) {
      showToast('هشدار: همگام‌سازی موتور سکیل‌ها با Google Sheets ناموفق بود', '⚠️');
    }
    const requestSyncSuccess = await syncRequestsWithGoogleSheets(allData);
    if (!requestSyncSuccess) {
      showToast('هشدار: همگام‌سازی درخواست‌ها با Google Sheets ناموفق بود', '⚠️');
    }
    currentRecordCount = allData.length;
    updateDepartments(); 
    if (handler && handler.onDataChanged) {
      handler.onDataChanged(allData);
    }
    return { isOk: true };
  },
  create: async (item) => {
    if (currentRecordCount >= 10000000000000) {
      showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
      return { isOk: false };
    }
    item.__backendId = generateId();
    item.type = item.type || 'unknown'; 
    if (item.type === 'employee') {
      const gsData = mapEmployeeToGS(item);
      const gsResult = await callGoogleSheets('create', 'employees', gsData);
      if (!gsResult.success) {
        showToast('خطا در ذخیره کارمند در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'motorcycle') {
      const gsData = mapMotorcycleToGS(item);
      const gsResult = await callGoogleSheets('create', 'motors', gsData);
      if (!gsResult.success) {
        showToast('خطا در ذخیره موتور سکیل در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'request') {
      const gsData = mapRequestToGS(item);
      const gsResult = await callGoogleSheets('create', 'request', gsData);
      if (!gsResult.success) {
        showToast('خطا در ذخیره درخواست در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    allData.push(item);
    await saveData(allData);
    currentRecordCount = allData.length;
    updateDepartments(); 
    if (dataHandler && dataHandler.onDataChanged) {
      dataHandler.onDataChanged(allData);
    }
    return { isOk: true };
  },
  update: async (item) => {
    const index = allData.findIndex(d => d.__backendId === item.__backendId);
    if (index === -1) {
      return { isOk: false };
    }
    if (item.type === 'employee') {
      const gsData = mapEmployeeToGS(item);
      const gsResult = await callGoogleSheets('update', 'employees', gsData);
      if (!gsResult.success) {
        showToast('خطا در به‌روزرسانی کارمند در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'motorcycle') {
      const gsData = mapMotorcycleToGS(item);
      const gsResult = await callGoogleSheets('update', 'motors', gsData);
      if (!gsResult.success) {
        showToast('خطا در به‌روزرسانی موتور سکیل در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'request') {
      const gsData = mapRequestToGS(item);
      const gsResult = await callGoogleSheets('update', 'request', gsData);
      if (!gsResult.success) {
        showToast('خطا در به‌روزرسانی درخواست در Google Sheets', '❌');
        return { isOk: false };
      }
    }
    allData[index] = { ...allData[index], ...item }; 
    await saveData(allData);
    currentRecordCount = allData.length;
    updateDepartments(); 
    if (dataHandler && dataHandler.onDataChanged) {
      dataHandler.onDataChanged(allData);
    }
    return { isOk: true };
  },
  delete: async (item) => {
    const index = allData.findIndex(d => d.__backendId === item.__backendId);
    if (index === -1) {
      return { isOk: false };
    }
    if (item.type === 'employee') {
      const gsResult = await callGoogleSheets('delete', 'employees', { __backendId: item.__backendId });
      if (!gsResult.success) {
        showToast('خطا در حذف کارمند از Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'motorcycle') {
      const gsResult = await callGoogleSheets('delete', 'motors', { __backendId: item.__backendId });
      if (!gsResult.success) {
        showToast('خطا در حذف موتور سکیل از Google Sheets', '❌');
        return { isOk: false };
      }
    }
    if (item.type === 'request') {
      const gsResult = await callGoogleSheets('delete', 'request', { __backendId: item.__backendId });
      if (!gsResult.success) {
        showToast('خطا در حذف درخواست از Google Sheets', '❌');
        return { isOk: false };
      }
    }
    allData.splice(index, 1);
    await saveData(allData);
    currentRecordCount = allData.length;
    updateDepartments(); 
    if (dataHandler && dataHandler.onDataChanged) {
      dataHandler.onDataChanged(allData);
    }
    return { isOk: true };
  }
};
function updateDepartments() {
  const uniqueDepartments = [...new Set(allData.filter(d => d.type === 'motorcycle').map(d => d.motorcycleDepartment))];
  departments = uniqueDepartments.sort(); 
}
const passwords = {
  request: '123',
  management: '456',
  motorcycle: 'motor123',
  employee: 'staff456'
};
const dataHandler = {
  onDataChanged(data) {
    allData = data;
    currentRecordCount = data.length;
    updateDepartments(); 
    updateCurrentPage();
  }
};
function navigateTo(path) {
  window.location.href = path;
}
function getCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('requests')) return 'requests';
  if (path.includes('management')) return 'management';
  if (path.includes('motorcycles')) return 'motorcycles';
  if (path.includes('employees')) return 'employees';
  if (path.includes('history')) return 'history';
  if (path.includes('request-menu')) return 'request-menu';
  if (path.includes('motorcycle-status')) return 'motorcycle-status';
  if (path.includes('accounts')) return 'accounts';
  if (path.includes('profile-settings')) return 'profile-settings';
  return 'dashboard';
}
function updateCurrentPage() {
  const page = getCurrentPage();
  switch (page) {
    case 'requests':
      renderRequests(allData.filter(d => d.type === 'request'));
      break;
    case 'motorcycles':
      renderMotorcycles(allData.filter(d => d.type === 'motorcycle'));
      break;
    case 'employees':
      renderEmployees(allData.filter(d => d.type === 'employee'));
      break;
    case 'history':
      const allCompleted = allData.filter(d => d.type === 'request' && d.status === 'completed');
      renderHistory(filterHistory(allCompleted));
       break;
    case 'accounts':
      renderAccounts();
      break;
    case 'motorcycle-status':
      const motorcycles = allData.filter(d => d.type === 'motorcycle');
      const requests = allData.filter(d => d.type === 'request');
      renderMotorcycleStatus(motorcycles, requests);
      break;
    default:
      updateDashboard();
      break;
  }
}
function logout() {
  if (window.idleInterval) {
    clearInterval(window.idleInterval);
    window.idleInterval = null;
  }
  localStorage.removeItem('session');
  window.location.href = 'login.html';
}
function renderAccounts() {
  const container = document.getElementById('accounts-list');
  if (!container) return;
  if (allUsers.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ اکانتی ثبت نشده است</p></div>';
    return;
  }
  const userCards = allUsers.map(user => {
    let actionButtons = '';
    if (currentUserRole === 'admin') {
      actionButtons = `
        <div class="flex items-center gap-2">
          <button class="btn btn-primary px-3 py-1 text-sm" onclick="openEditRoleModal('${user.__backendId}', '${user.username}', '${user.role}')">✏️ ویرایش نقش</button>
          <button class="delete-btn" onclick="deleteUser('${user.__backendId}')">🗑️ حذف</button>
        </div>
      `;
    }
    return `
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="motorcycle-icon">
              ${user.photo ? `<img src="${user.photo}" alt="Profile Photo" class="w-full h-full rounded-full object-cover">` : '👤'}
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">${user.fullName}</h3>
              <p class="text-gray-200 mt-1">نام کاربری: ${user.username}</p>
              <p class="text-gray-200 mt-1">نقش: ${user.role === 'admin' ? 'ادمین' : 'کاربر'}</p>
            </div>
          </div>
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
  container.innerHTML = userCards;
  const newAccountBtn = document.querySelector('button[onclick="openNewAccountModal()"]');
  if (newAccountBtn) {
    if (currentUserRole !== 'admin') {
      newAccountBtn.classList.add('hidden');
    } else {
      newAccountBtn.classList.remove('hidden');
    }
  }
}
function openNewAccountModal() {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ایجاد اکانت ندارید', '⚠️');
    return;
  }
  document.getElementById('new-account-form').reset();
  document.getElementById('new-account-modal').classList.add('active');
}
function openEditRoleModal(userId, username, currentRole) {
  if (currentUserRole !== 'admin') {
    showToast('شما دسترسی به ویرایش نقش ندارید', '⚠️');
    return;
  }
  document.getElementById('edit-role-username').textContent = `اکانت: ${username}`;
  document.getElementById('edit-role-select').value = currentRole;
  document.getElementById('edit-role-form').dataset.userId = userId;
  document.getElementById('edit-role-modal').classList.add('active');
}
async function submitNewAccount(event) {
  event.preventDefault();
  const fullName = document.getElementById('account-fullname').value.trim();
  const username = document.getElementById('account-username').value.trim();
  const password = document.getElementById('account-password').value;
  const role = document.getElementById('account-role').value;
  if (!fullName || !username || !password || !role) {
    showToast('لطفاً همه فیلدها را پر کنید', '⚠️');
    return;
  }
  const result = await createUser({ fullName, username, password, role });
  if (result.isOk) {
    showToast('اکانت با موفقیت اضافه شد', '✅');
    closeModal('new-account-modal');
  } else {
    showToast('خطا در افزودن اکانت', '❌');
  }
}
async function submitRoleUpdate(event) {
  event.preventDefault();
  const userId = document.getElementById('edit-role-form').dataset.userId;
  const newRole = document.getElementById('edit-role-select').value;
  const result = await updateUserRole(userId, newRole);
  if (result.isOk) {
    showToast('نقش با موفقیت به‌روزرسانی شد', '✅');
    closeModal('edit-role-modal');
  } else {
    showToast('خطا در به‌روزرسانی نقش', '❌');
  }
}

 async function initApp() {
  console.log('initApp started'); // دیباگ
  // چک لاگین
  const sessionStr = localStorage.getItem('session');
  console.log('Session from LS:', sessionStr); // دیباگ

  if (!sessionStr) {
    console.log('No session – redirect to login');
    window.location.href = 'login.html';
    return;
  }

  let session;
  try {
    session = JSON.parse(sessionStr);
    console.log('Parsed session:', session); // دیباگ
  } catch (e) {
    console.error('Session parse error:', e);
    localStorage.removeItem('session'); // پاک کردن corrupted
    window.location.href = 'login.html';
    return;
  }

  if (!session.loggedIn) {
    console.log('Not logged in – redirect');
    localStorage.removeItem('session');
    window.location.href = 'login.html';
    return;
  }

  // Load users (حالا با sync)
  await loadUsers();
  console.log('Users after load:', allUsers.map(u => u.username)); // دیباگ

  // پیدا کردن currentUser
  const currentUser = allUsers.find(u => u.username === session.username);
  console.log('Current user found:', currentUser?.username); // دیباگ

  if (!currentUser) {
    console.error('Current user not found in allUsers – possible sync issue');
    localStorage.removeItem('session');
    window.location.href = 'login.html';
    return;
  }

  window.currentUser = currentUser;
  currentUserRole = currentUser.role;

  // FIX: session.fullName رو update کن
  session.fullName = currentUser.fullName;
  localStorage.setItem('session', JSON.stringify(session)); // re-save

  // نمایش نام و ... (بقیه کد بدون تغییر)
  if (document.getElementById('current-user')) {
    document.getElementById('current-user').textContent = currentUser.fullName || "کاربر ناشناس";
  }
  const userIcon = document.getElementById('user-profile-icon');
  if (userIcon) {
    if (currentUser.photo) {
      userIcon.innerHTML = `<img src="${currentUser.photo}" alt="Profile Photo" class="w-full h-full rounded-full object-cover">`;
    } else {
      userIcon.innerHTML = '👤';
    }
  }
  const newAccountBtn = document.querySelector('button[onclick="openNewAccountModal()"]');
  if (newAccountBtn && currentUserRole !== 'admin') {
    newAccountBtn.classList.add('hidden');
  }
  if (getCurrentPage() === 'management') {
    const accountsCard = document.querySelector('button[onclick*="accounts"], .card[onclick*="accounts"], div[onclick*="accounts"], [onclick*="accounts"]');
    if (accountsCard && currentUserRole !== 'admin') {
      accountsCard.classList.add('hidden');
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);
  const initResult = await window.dataSdk.init(dataHandler);
  if (!initResult.isOk) {
    showToast('خطا در بارگذاری داده‌ها', '❌');
  }
  if (window.elementSdk && typeof window.elementSdk.init === 'function') {
    await window.elementSdk.init({
      defaultConfig,
      onConfigChange: async (config) => {
        document.getElementById('dashboard-title').textContent = config.dashboard_title || defaultConfig.dashboard_title;
        document.getElementById('company-name').textContent = config.company_name || defaultConfig.company_name;
      },
      mapToCapabilities: (config) => ({
        recolorables: [
          {
            get: () => config.primary_color || defaultConfig.primary_color,
            set: (value) => {
              window.elementSdk.config.primary_color = value;
              window.elementSdk.setConfig({ primary_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: undefined,
        fontSizeable: undefined
      }),
      mapToEditPanelValues: (config) => new Map([
        ['dashboard_title', config.dashboard_title || defaultConfig.dashboard_title],
        ['company-name', config.company_name || defaultConfig.company_name]
      ])
    });
  } else {
    console.warn('elementSdk is not available. Skipping initialization.');
    if (document.getElementById('dashboard-title')) {
      document.getElementById('dashboard-title').textContent = defaultConfig.dashboard_title;
    }
    if (document.getElementById('company-name')) {
      document.getElementById('company-name').textContent = defaultConfig.company_name;
    }
  }
  updateCurrentPage();
  setupIdleLogout();
}
function setupIdleLogout() {
  if (typeof window.idleTime === 'undefined') {
    window.idleTime = 0;
  }
  const resetIdleTime = () => {
    window.idleTime = 0;
  };
  if (!window.listenersAdded) {
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
      document.addEventListener(event, resetIdleTime, true);
    });
    window.listenersAdded = true;
  }
  if (window.idleInterval) {
    clearInterval(window.idleInterval);
  }
  window.idleTime = 0; 
  window.idleInterval = setInterval(() => {
    window.idleTime += 1;
    if (window.idleTime >= 600) { 
      showToast('به دلیل عدم فعالیت، شما لاگ‌اوت شدید', '⚠️');
      logout();
      clearInterval(window.idleInterval);
      window.idleInterval = null;
    }
  }, 1000);
  const resetIdleTimeLocal = () => {
    idleTime = 0;
  };
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
    document.addEventListener(event, resetIdleTimeLocal, true);
  });
}
function updateDateTime() {
  const now = new Date();
  const weekday = now.toLocaleString('en-US', { weekday: 'short' });
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();
  const formatted = `${weekday}, ${month}, ${day}, ${year}`;
  document.getElementById('current-date').textContent = formatted;
}
function updateDashboard() {
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  const employees = allData.filter(d => d.type === 'employee');
  const requests = allData.filter(d => d.type === 'request');
  const activeRequests = requests.filter(r => r.status === 'pending' || r.status === 'active');
  const inUse = requests.filter(r => r.status === 'active');
  if (document.getElementById('total-motorcycles')) document.getElementById('total-motorcycles').textContent = motorcycles.length;
  if (document.getElementById('total-employees')) document.getElementById('total-employees').textContent = employees.length;
  if (document.getElementById('active-requests')) document.getElementById('active-requests').textContent = activeRequests.length;
  if (document.getElementById('in-use')) document.getElementById('in-use').textContent = inUse.length;
  if (getCurrentPage() === 'dashboard') {
    renderRequests(requests);
    renderMotorcycles(motorcycles);
    renderEmployees(employees);
    renderHistory(requests.filter(r => r.status === 'completed'));
    renderMotorcycleStatus(motorcycles, requests);
    updateModalSelects(employees, motorcycles);
  }
}
function renderRequests(requests) {
  const container = document.getElementById('requests-list');
  if (!container) return;
  const requestedMotorcycles = requests.filter(r => r.status === 'pending' || r.status === 'active');
  if (requestedMotorcycles.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ موتور سکیلی درخواست نشده است</p><p class="text-sm mt-2">تمام موتور سکیل‌ها در دسترس هستند</p></div>';
    return;
  }
  container.innerHTML = requestedMotorcycles.map(request => `
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4 flex-1">
          <div class="motorcycle-icon engine-glow">
            🏍️
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white">${request.motorcycleName} - ${request.motorcycleColor} - دیپارتمنت ${request.motorcycleDepartment}</h3>
            <p class="text-gray-100 mt-1">👤 ${request.employeeName} (${request.department})</p>
            <p class="text-gray-100 mt-1">🆔 درخواست کننده: ${request.requesterFullName || 'ناشناس'}</p> <!-- تغییر: اضافه کردن نام درخواست‌کننده -->
            <p class="text-sm text-gray-100 mt-1">📅 ${request.requestDate}</p>
            ${request.exitTime ? `<p class="text-sm text-gray-100">🕐 خروج: ${request.exitTime}</p>` : ''}
            <p class="text-sm text-gray-100 mt-1">🔢 پلاک: ${request.motorcyclePlate}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="status-badge ${request.status === 'pending' ? 'status-pending' : 'status-active'}">
            ${request.status === 'pending' ? '⏳ در انتظار تحویل' : '🔄 در حال استفاده'}
          </span>
          ${request.status === 'pending' ?
            `<button class="btn btn-success" onclick="markAsExit('${request.__backendId}')">🚀 خروج</button>` :
            `<button class="btn btn-primary" onclick="markAsEntry('${request.__backendId}')">🏁 ورود</button>`
          }
        </div>
      </div>
    </div>
  `).join('');
}
function renderMotorcycles(motorcycles) {
  const container = document.getElementById('motorcycles-list');
  if (!container) return;
  if (motorcycles.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ موتور سکیلی ثبت نشده است</p></div>';
    return;
  }
  container.innerHTML = motorcycles.map(motorcycle => `
    <div class="card p-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="motorcycle-icon">
          🏍️
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-white">${motorcycle.motorcycleName}</h3>
          <p class="text-gray-200">🎨 ${motorcycle.motorcycleColor}</p>
          <p class="text-sm text-gray-200 font-semibold">🏢 ${motorcycle.motorcycleDepartment}</p>
        </div>
        <button class="delete-btn" onclick="deleteMotorcycle('${motorcycle.__backendId}')">
          🗑️ حذف
        </button>
      </div>
      <div class="border-t border-gray-600 pt-4">
        <p class="text-sm text-gray-100">🔢 پلاک: ${motorcycle.motorcyclePlate}</p>
      </div>
    </div>
  `).join('');
}
function renderEmployees(employees) {
  const container = document.getElementById('employees-list');
  if (!container) return;
  if (employees.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ کارمندی ثبت نشده است</p></div>';
    return;
  }
  container.innerHTML = employees.map(employee => `
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="motorcycle-icon">
            👤
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">${employee.employeeName}</h3>
            <p class="text-gray-200 mt-1">🏢 ${employee.department}</p>
            <p class="text-sm text-gray-100 mt-1">🆔 ${employee.employeeId} | 👆 ${employee.fingerprintId}</p>
          </div>
        </div>
        <button class="delete-btn" onclick="deleteEmployee('${employee.__backendId}')">
          🗑️ حذف
        </button>
      </div>
    </div>
  `).join('');
}
function renderHistory(filteredRequests) {
  const container = document.getElementById('history-list');
  if (!container) return;
  if (filteredRequests.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-300"><p class="text-lg">هیچ تاریخچه‌ای با فیلترهای انتخابی وجود ندارد</p></div>';
    return;
  }
  container.innerHTML = filteredRequests.map(request => `
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4 flex-1">
          <div class="motorcycle-icon">
            📊
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white">${request.motorcycleName} - ${request.motorcycleColor} - دیپارتمنت ${request.motorcycleDepartment}</h3>
            <p class="text-gray-200 mt-1">👤 ${request.employeeName} (${request.department})</p>
            <p class="text-gray-200 mt-1">🆔 درخواست کننده: ${request.requesterFullName || 'ناشناس'}</p> <!-- تغییر: اضافه کردن نام درخواست‌کننده -->
            <div class="flex gap-6 mt-2 text-sm text-gray-100">
              <span>📅 ${request.requestDate}</span>
              <span>🚀 خروج: ${request.exitTime}</span>
              <span>🏁 ورود: ${request.entryTime}</span>
            </div>
          </div>
        </div>
        <span class="status-badge status-completed">✅ تکمیل شده</span>
      </div>
    </div>
  `).join('');
}
function renderMotorcycleStatus(motorcycles, requests) {
  const container = document.getElementById('motorcycle-status-list');
  if (!container) return;
  if (motorcycles.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ موتور سکیلی ثبت نشده است</p></div>';
    return;
  }
  let availableCount = 0;
  let pendingCount = 0;
  let inUseCount = 0;
  const motorcycleStatusData = motorcycles.map(motorcycle => {
    const activeRequest = requests.find(r =>
      r.motorcycleId === motorcycle.__backendId &&
      (r.status === 'pending' || r.status === 'active')
    );
    let status, statusClass, statusIcon, statusText, employeeInfo;
    if (!activeRequest) {
      status = 'available';
      statusClass = 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-400/30';
      statusIcon = '🅿️';
      statusText = 'موجود در پارکینگ';
      employeeInfo = '';
      availableCount++;
    } else if (activeRequest.status === 'pending') {
      status = 'pending';
      statusClass = 'bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border-yellow-400/30';
      statusIcon = '⏳';
      statusText = 'در انتظار خروج';
      employeeInfo = `👤 ${activeRequest.employeeName}`;
      pendingCount++;
    } else if (activeRequest.status === 'active') {
      status = 'in-use';
      statusClass = 'bg-gradient-to-br from-red-500/20 to-pink-600/20 border-red-400/30';
      statusIcon = '🔄';
      statusText = 'در حال استفاده';
      employeeInfo = `👤 ${activeRequest.employeeName}`;
      inUseCount++;
    }
    return {
      motorcycle,
      status,
      statusClass,
      statusIcon,
      statusText,
      employeeInfo,
      activeRequest
    };
  });
  if (document.getElementById('available-count')) document.getElementById('available-count').textContent = availableCount;
  if (document.getElementById('pending-count')) document.getElementById('pending-count').textContent = pendingCount;
  if (document.getElementById('in-use-count')) document.getElementById('in-use-count').textContent = inUseCount;
  const filteredData = currentStatusFilter === 'all' ?
    motorcycleStatusData :
    motorcycleStatusData.filter(data => data.status === currentStatusFilter);
    document.getElementById('filtered-count').textContent = filteredData.length;
  if (filteredData.length === 0) {
    const filterNames = {
      'available': 'موجود در پارکینگ',
      'pending': 'در انتظار خروج',
      'in-use': 'در حال استفاده'
    };
    const filterName = filterNames[currentStatusFilter] || 'این فیلتر';
    container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-300"><p class="text-lg">هیچ موتور سکیلی با وضعیت "${filterName}" یافت نشد</p></div>`;
    return;
  }
  container.innerHTML = filteredData.map(data => `
    <div class="card p-6 ${data.statusClass}">
      <div class="flex items-center gap-4 mb-4">
        <div class="motorcycle-icon">
          🏍️
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-white">${data.motorcycle.motorcycleName}</h3>
          <p class="text-gray-300">🎨 ${data.motorcycle.motorcycleColor}</p>
          <p class="text-sm text-gray-200 font-semibold">🏢 ${data.motorcycle.motorcycleDepartment}</p>
        </div>
        <div class="text-center">
          <div class="text-3xl mb-1">${data.statusIcon}</div>
          <span class="text-xs text-white font-semibold">${data.statusText}</span>
        </div>
      </div>
      <div class="border-t border-gray-600 pt-4">
        <p class="text-sm text-gray-300 mb-2">🔢 پلاک: ${data.motorcycle.motorcyclePlate}</p>
        ${data.employeeInfo ? `<p class="text-sm text-gray-300 mb-2">${data.employeeInfo}</p>` : ''}
        ${data.activeRequest && data.activeRequest.requestDate ? `<p class="text-xs text-gray-400">📅 ${data.activeRequest.requestDate}</p>` : ''}
        ${data.activeRequest && data.activeRequest.exitTime ? `<p class="text-xs text-gray-400">🚀 خروج: ${data.activeRequest.exitTime}</p>` : ''}
      </div>
    </div>
  `).join('');
}
function filterMotorcycleStatus(filter) {
  currentStatusFilter = filter;
  updateCurrentPage();
}
function filterHistory(completedRequests) {
  if (!completedRequests) {
    completedRequests = allData.filter(d => d.type === 'request' && d.status === 'completed');
  }
  const searchTerm = document.getElementById('history-search')?.value.toLowerCase() || historySearchTerm;
  const fromDateStr = document.getElementById('history-from-date')?.value || historyFromDate;
  const toDateStr = document.getElementById('history-to-date')?.value || historyToDate;
  let filtered = completedRequests;
  if (searchTerm) {
    filtered = filtered.filter(r =>
      r.employeeName.toLowerCase().includes(searchTerm) ||
      r.motorcycleName.toLowerCase().includes(searchTerm) ||
      (r.requesterFullName && r.requesterFullName.toLowerCase().includes(searchTerm))
    );
  }
  if (fromDateStr || toDateStr) {
    filtered = filtered.filter(r => {
      const parts = r.requestDate.split('/');
      if (parts.length !== 3) return true; 
      const [j_y, j_m, j_d] = parts.map(p => parseInt(p.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728)))); 
      const gregDate = JalaliDate.jalaliToGregorian(j_y, j_m, j_d);
      const reqDate = `${gregDate[0]}-${gregDate[1]}-${gregDate[2]}`; 
      if (fromDateStr && reqDate < fromDateStr) return false;
      if (toDateStr && reqDate > toDateStr) return false;
      return true;
    });
  }
  historySearchTerm = searchTerm;
  historyFromDate = fromDateStr;
  historyToDate = toDateStr;
  renderHistory(filtered);
  return filtered;
}
function populateDepartmentDropdown() {
  const optionsContainer = document.getElementById('department-options');
  if (!optionsContainer) return;
  if (availableDepartments.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ دیپارتمنتی ثبت نشده است. ابتدا موتور سکیل اضافه کنید.</div>';
    return;
  }
  optionsContainer.innerHTML = availableDepartments.map(dept =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectDepartment('${dept}')">${dept}</div>`
  ).join('');
}
function searchDepartments() {
  const searchTerm = document.getElementById('department-search').value.toLowerCase();
  const filteredDepartments = availableDepartments.filter(dept => dept.toLowerCase().includes(searchTerm));
  const optionsContainer = document.getElementById('department-options');
  if (!optionsContainer) return;
  if (filteredDepartments.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ دیپارتمنتی یافت نشد</div>';
    return;
  }
  optionsContainer.innerHTML = filteredDepartments.map(dept =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectDepartment('${dept}')">${dept}</div>`
  ).join('');
}
function toggleDepartmentDropdown() {
  const dropdown = document.getElementById('department-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  document.getElementById('employee-dropdown')?.classList.add('hidden');
  document.getElementById('motorcycle-dropdown')?.classList.add('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    document.getElementById('department-search').value = '';
    populateDepartmentDropdown();
    setTimeout(() => document.getElementById('department-search').focus(), 100);
  } else {
    dropdown.classList.add('hidden');
  }
}
function selectDepartment(department) {
  document.getElementById('department-display').textContent = department;
  document.getElementById('selected-department').value = department;
  document.getElementById('department-dropdown').classList.add('hidden');
  filterByDepartment();
}
function filterByDepartment() {
  const selectedDepartment = document.getElementById('selected-department').value;
  const employeeSelect = document.getElementById('employee-select');
  const motorcycleSelect = document.getElementById('motorcycle-select');
  const employeeDisplay = document.getElementById('employee-display');
  const motorcycleDisplay = document.getElementById('motorcycle-display');
  if (!selectedDepartment) {
    employeeSelect.disabled = true;
    motorcycleSelect.disabled = true;
    employeeSelect.classList.add('opacity-50');
    motorcycleSelect.classList.add('opacity-50');
    employeeDisplay.textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
    motorcycleDisplay.textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
    return;
  }
  if (selectedDepartment === 'متفرقه') {
    availableEmployees = allData.filter(d => d.type === 'employee');
    availableMotorcycles = allData.filter(d => d.type === 'motorcycle');
  } else {
    availableEmployees = allData.filter(d => d.type === 'employee' && d.department === selectedDepartment);
    availableMotorcycles = allData.filter(d => d.type === 'motorcycle' && d.motorcycleDepartment === selectedDepartment);
  }
  employeeDisplay.textContent = availableEmployees.length > 0 ? 'کارمند را انتخاب کنید' : 'هیچ کارمندی در این دیپارتمنت یافت نشد';
  motorcycleDisplay.textContent = availableMotorcycles.length > 0 ? 'موتور سکیل را انتخاب کنید' : 'هیچ موتور سکیلی در این دیپارتمنت یافت نشد';
  employeeSelect.disabled = false;
  motorcycleSelect.disabled = false;
  employeeSelect.classList.remove('opacity-50');
  motorcycleSelect.classList.remove('opacity-50');
  document.getElementById('selected-employee').value = '';
  document.getElementById('selected-motorcycle').value = '';
  populateEmployeeDropdown();
  populateMotorcycleDropdown();
}
let availableDepartments = [];
let availableEmployees = [];
let availableMotorcycles = [];
function updateModalSelects(employees, motorcycles) {
  const uniqueDepts = [...new Set([...employees.map(e => e.department), ...motorcycles.map(m => m.motorcycleDepartment)])].sort();
  availableDepartments = ['متفرقه', ...uniqueDepts];
  populateDepartmentDropdown();
}
function populateEmployeeDropdown() {
  const searchTerm = document.getElementById('employee-search').value.toLowerCase();
  const filteredEmployees = availableEmployees.filter(emp =>
    emp.employeeName.toLowerCase().includes(searchTerm) ||
    emp.employeeId.toLowerCase().includes(searchTerm)
  );
  const optionsContainer = document.getElementById('employee-options');
  if (!optionsContainer) return;
  optionsContainer.innerHTML = filteredEmployees.map(emp =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectEmployee('${emp.__backendId}', '${emp.employeeName} - ${emp.employeeId}')">${emp.employeeName} - ${emp.employeeId}</div>`
  ).join('');
}
function searchEmployees() {
  populateEmployeeDropdown();
}
function toggleEmployeeDropdown() {
  if (document.getElementById('employee-select').disabled) return;
  const dropdown = document.getElementById('employee-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  document.getElementById('department-dropdown')?.classList.add('hidden');
  document.getElementById('motorcycle-dropdown')?.classList.add('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    document.getElementById('employee-search').value = '';
    populateEmployeeDropdown();
    setTimeout(() => document.getElementById('employee-search').focus(), 100);
  } else {
    dropdown.classList.add('hidden');
  }
}
function selectEmployee(employeeId, employeeText) {
  document.getElementById('employee-display').textContent = employeeText;
  document.getElementById('selected-employee').value = employeeId;
  document.getElementById('employee-dropdown').classList.add('hidden');
}
function populateMotorcycleDropdown() {
  const optionsContainer = document.getElementById('motorcycle-options');
  if (!optionsContainer) return;
  const activeRequests = allData.filter(d => d.type === 'request' && (d.status === 'pending' || d.status === 'active'));
  const requestedMotorcycleIds = activeRequests.map(r => r.motorcycleId);
  const availableMotorcyclesForRequest = availableMotorcycles.filter(moto =>
    !requestedMotorcycleIds.includes(moto.__backendId)
  );
  if (availableMotorcyclesForRequest.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ موتور سکیل آزادی در این دیپارتمنت موجود نیست</div>';
    return;
  }
  optionsContainer.innerHTML = availableMotorcyclesForRequest.map(moto =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectMotorcycle('${moto.__backendId}', '${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}')">${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}</div>`
  ).join('');
}
function searchMotorcycles() {
  const searchTerm = document.getElementById('motorcycle-search').value.toLowerCase();
  const activeRequests = allData.filter(d => d.type === 'request' && (d.status === 'pending' || d.status === 'active'));
  const requestedMotorcycleIds = activeRequests.map(r => r.motorcycleId);
  const availableMotorcyclesForRequest = availableMotorcycles.filter(moto =>
    !requestedMotorcycleIds.includes(moto.__backendId)
  );
  const filteredMotorcycles = availableMotorcyclesForRequest.filter(moto =>
    moto.motorcycleName.toLowerCase().includes(searchTerm) ||
    moto.motorcycleColor.toLowerCase().includes(searchTerm) ||
    moto.motorcyclePlate.toLowerCase().includes(searchTerm)
  );
  const optionsContainer = document.getElementById('motorcycle-options');
  if (!optionsContainer) return;
  if (filteredMotorcycles.length === 0) {
    optionsContainer.innerHTML = '<div class="p-3 text-gray-500 text-center">هیچ موتور سکیل آزادی یافت نشد</div>';
    return;
  }
  optionsContainer.innerHTML = filteredMotorcycles.map(moto =>
    `<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectMotorcycle('${moto.__backendId}', '${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}')">${moto.motorcycleName} - ${moto.motorcycleColor} - ${moto.motorcycleDepartment}</div>`
  ).join('');
}
function toggleMotorcycleDropdown() {
  if (document.getElementById('motorcycle-select').disabled) return;
  const dropdown = document.getElementById('motorcycle-dropdown');
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains('hidden');
  document.getElementById('department-dropdown')?.classList.add('hidden');
  document.getElementById('employee-dropdown')?.classList.add('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    document.getElementById('motorcycle-search').value = '';
    populateMotorcycleDropdown();
    setTimeout(() => document.getElementById('motorcycle-search').focus(), 100);
  } else {
    dropdown.classList.add('hidden');
  }
}
function selectMotorcycle(motorcycleId, motorcycleText) {
  document.getElementById('motorcycle-display').textContent = motorcycleText;
  document.getElementById('selected-motorcycle').value = motorcycleId;
  document.getElementById('motorcycle-dropdown').classList.add('hidden');
}
function openPasswordModal(type) {
  if (currentUserRole === 'admin') {
    if (type === 'request') {
      openNewRequestModal();
    } else if (type === 'management') {
      navigateTo('./management.html');
    } else if (type === 'motorcycle') {
      openNewMotorcycleModal();
    } else if (type === 'employee') {
      openNewEmployeeModal();
    }
    return;
  }
  currentPasswordType = type;
  const messages = {
    request: '🔐 برای ایجاد درخواست جدید، رمز عبور را وارد کنید',
    management: '🔐 برای دسترسی به پنل مدیریت، رمز عبور را وارد کنید',
    motorcycle: '🔐 برای افزودن موتور سکیل، رمز عبور مدیریت موتور سکیل‌ها را وارد کنید',
    employee: '🔐 برای افزودن کارمند، رمز عبور مدیریت کارمندان را وارد کنید'
  };
  document.getElementById('password-message').textContent = messages[type];
  document.getElementById('password-modal').classList.add('active');
  document.getElementById('password-input').focus();
}
function verifyPassword(event) {
  event.preventDefault();
  const enteredPassword = document.getElementById('password-input').value;
  const correctPassword = passwords[currentPasswordType];
  if (enteredPassword === correctPassword) {
    closeModal('password-modal');
    document.getElementById('password-form').reset();
    if (currentPasswordType === 'request') {
      openNewRequestModal();
    } else if (currentPasswordType === 'management') {
      navigateTo('./management.html');
    } else if (currentPasswordType === 'motorcycle') {
      openNewMotorcycleModal();
    } else if (currentPasswordType === 'employee') {
      openNewEmployeeModal();
    }
  } else {
    showToast('رمز عبور اشتباه است', '❌');
    document.getElementById('password-input').value = '';
    document.getElementById('password-input').focus();
  }
}
function openNewRequestModal() {
  const employees = allData.filter(d => d.type === 'employee');
  const motorcycles = allData.filter(d => d.type === 'motorcycle');
  updateModalSelects(employees, motorcycles); 
  document.getElementById('new-request-modal').classList.add('active');
  populateDepartmentDropdown(); 
}
function openNewMotorcycleModal() {
  document.getElementById('new-motorcycle-modal').classList.add('active');
}
function openNewEmployeeModal() {
  document.getElementById('new-employee-modal').classList.add('active');
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}
async function submitNewRequest(event) {
  event.preventDefault();
  if (currentRecordCount >= 100000000000) {
    showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
    return;
  }
  const form = event.target;
  form.classList.add('loading');
  const employeeId = document.getElementById('selected-employee').value;
  const motorcycleId = document.getElementById('selected-motorcycle').value;
  const employee = allData.find(d => d.__backendId === employeeId);
  const motorcycle = allData.find(d => d.__backendId === motorcycleId);
  const now = new Date();
 
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); 
  const day = String(now.getDate()).padStart(2, '0');
  const requestDate = `${year}/${month}/${day}`;
 
  let requesterFullName = 'ناشناس';
  if (window.currentUser && window.currentUser.fullName) {
    requesterFullName = window.currentUser.fullName;
    console.log('Requester from currentUser:', requesterFullName); 
  } else {
    try {
      const session = JSON.parse(localStorage.getItem('session'));
      if (session && session.fullName) {
        requesterFullName = session.fullName;
        console.log('Requester from session:', requesterFullName);
      } else {
        console.error('No fullName in session or currentUser!');
      }
    } catch (e) {
      console.error('Session parse error:', e);
    }
  }
 
  console.log('Request Date (fixed):', requestDate);
  console.log('Requester FullName:', requesterFullName);
 
  const requestData = {
    type: 'request',
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    department: employee.department,
    fingerprintId: employee.fingerprintId,
    motorcycleId: motorcycle.__backendId,
    motorcycleName: motorcycle.motorcycleName,
    motorcycleColor: motorcycle.motorcycleColor,
    motorcyclePlate: motorcycle.motorcyclePlate,
    motorcycleDepartment: motorcycle.motorcycleDepartment,
    requestDate: requestDate, 
    requesterFullName: requesterFullName,
    exitTime: '',
    entryTime: '',
    status: 'pending'
  };
  const result = await window.dataSdk.create(requestData);
  form.classList.remove('loading');
  if (result.isOk) {
    showToast('درخواست با موفقیت ثبت شد', '✅');
    closeModal('new-request-modal');
    resetRequestForm();
  } else {
    showToast('خطا در ثبت درخواست', '❌');
  }
}
function resetRequestForm() {
  document.getElementById('department-display').textContent = 'دیپارتمنت را انتخاب کنید';
  document.getElementById('employee-display').textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
  document.getElementById('motorcycle-display').textContent = 'ابتدا دیپارتمنت را انتخاب کنید';
  document.getElementById('selected-department').value = '';
  document.getElementById('selected-employee').value = '';
  document.getElementById('selected-motorcycle').value = '';
  document.getElementById('employee-select').disabled = true;
  document.getElementById('motorcycle-select').disabled = true;
  document.getElementById('employee-select').classList.add('opacity-50');
  document.getElementById('motorcycle-select').classList.add('opacity-50');
  document.getElementById('department-dropdown')?.classList.add('hidden');
  document.getElementById('employee-dropdown')?.classList.add('hidden');
  document.getElementById('motorcycle-dropdown')?.classList.add('hidden');
}
async function submitNewMotorcycle(event) {
  event.preventDefault();
  if (currentRecordCount >= 100000000000) {
    showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
    return;
  }
  const form = event.target;
  form.classList.add('loading');
  const motorcycleData = {
    type: 'motorcycle',
    motorcycleName: document.getElementById('motorcycle-name').value,
    motorcycleColor: document.getElementById('motorcycle-color').value,
    motorcyclePlate: document.getElementById('motorcycle-plate').value,
    motorcycleDepartment: document.getElementById('motorcycle-department').value
  };
  const result = await window.dataSdk.create(motorcycleData);
  form.classList.remove('loading');
  if (result.isOk) {
    showToast('موتور سکیل با موفقیت اضافه شد', '✅');
    closeModal('new-motorcycle-modal');
    form.reset();
  } else {
    showToast('خطا در افزودن موتور سکیل', '❌');
  }
}
async function submitNewEmployee(event) {
  event.preventDefault();
  if (currentRecordCount >= 100000000000) {
    showToast('حداکثر تعداد رکوردها (۹۹۹) به پایان رسیده است', '⚠️');
    return;
  }
  const form = event.target;
  form.classList.add('loading');
  const employeeData = {
    type: 'employee',
    employeeName: document.getElementById('employee-name').value,
    employeeId: document.getElementById('employee-id').value,
    department: document.getElementById('employee-department').value,
    fingerprintId: document.getElementById('employee-fingerprint').value
  };
  const result = await window.dataSdk.create(employeeData);
  form.classList.remove('loading');
  if (result.isOk) {
    showToast('کارمند با موفقیت اضافه شد', '✅');
    closeModal('new-employee-modal');
    form.reset();
  } else {
    showToast('خطا در افزودن کارمند', '❌');
  }
}
async function markAsExit(requestId) {
  const request = allData.find(d => d.__backendId === requestId);
  if (!request) return;
  const now = new Date();
  const exitTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const updatedRequest = {
    ...request,
    exitTime: exitTime,
    status: 'active'
  };
  const result = await window.dataSdk.update(updatedRequest);
  if (result.isOk) {
    showToast('خروج با موفقیت ثبت شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در ثبت خروج', '❌');
  }
}
async function markAsEntry(requestId) {
  const request = allData.find(d => d.__backendId === requestId);
  if (!request) return;
  const now = new Date();
  const entryTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const updatedRequest = {
    ...request,
    entryTime: entryTime,
    status: 'completed'
  };
  const result = await window.dataSdk.update(updatedRequest);
  if (result.isOk) {
    showToast('ورود با موفقیت ثبت شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در ثبت ورود', '❌');
  }
}
async function deleteMotorcycle(motorcycleId) {
  const motorcycle = allData.find(d => d.__backendId === motorcycleId);
  if (!motorcycle) return;
  const inUse = allData.some(d => d.type === 'request' && d.motorcycleId === motorcycleId && (d.status === 'pending' || d.status === 'active'));
  if (inUse) {
    showToast('این موتور سکیل در حال استفاده است و قابل حذف نیست', '⚠️');
    return;
  }
  const result = await window.dataSdk.delete(motorcycle);
  if (result.isOk) {
    showToast('موتور سکیل با موفقیت حذف شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در حذف موتور سکیل', '❌');
  }
}
async function deleteEmployee(employeeId) {
  const employee = allData.find(d => d.__backendId === employeeId);
  if (!employee) return;
  const hasActiveRequests = allData.some(d => d.type === 'request' && d.employeeId === employee.employeeId && (d.status === 'pending' || d.status === 'active'));
  if (hasActiveRequests) {
    showToast('این کارمند درخواست فعال دارد و قابل حذف نیست', '⚠️');
    return;
  }
  const result = await window.dataSdk.delete(employee);
  if (result.isOk) {
    showToast('کارمند با موفقیت حذف شد', '✅');
    updateCurrentPage();
  } else {
    showToast('خطا در حذف کارمند', '❌');
  }
}
function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-message').textContent = message;
  document.getElementById('toast-icon').textContent = icon;
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}
document.addEventListener('click', function(event) {
  const departmentDropdown = document.getElementById('department-dropdown');
  const employeeDropdown = document.getElementById('employee-dropdown');
  const motorcycleDropdown = document.getElementById('motorcycle-dropdown');
  const departmentSelect = document.getElementById('department-select');
  const employeeSelect = document.getElementById('employee-select');
  const motorcycleSelect = document.getElementById('motorcycle-select');
  if (departmentDropdown && !departmentSelect.contains(event.target) && !departmentDropdown.contains(event.target)) {
    departmentDropdown.classList.add('hidden');
  }
  if (employeeDropdown && !employeeSelect.contains(event.target) && !employeeDropdown.contains(event.target)) {
    employeeDropdown.classList.add('hidden');
  }
  if (motorcycleDropdown && !motorcycleSelect.contains(event.target) && !motorcycleDropdown.contains(event.target)) {
    motorcycleDropdown.classList.add('hidden');
  }
  const userDropdown = document.getElementById('user-dropdown');
  const userIcon = document.getElementById('user-profile-icon');
  if (userDropdown && !userIcon.contains(event.target) && !userDropdown.contains(event.target)) {
    userDropdown.classList.add('hidden');
  }
});
function toggleUserDropdown() {
  const icon = document.getElementById('user-profile-icon');
  const dropdown = document.getElementById('user-dropdown');
  if (!dropdown || !icon) return;
  const rect = icon.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.top = rect.bottom + 8 + 'px';
  dropdown.style.left = rect.left + 'px';
  dropdown.classList.toggle('hidden');
}
document.addEventListener('DOMContentLoaded', initApp);
if (window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') {
  (function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'99bbf8eb8072d381',t:'MTc2MjY3NzI4MC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();

}
