const usersStorageKey = 'userAccountsData'; 
let allUsers = [];
let currentUser = null;

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function loadUsers() {
  try {
    const stored = localStorage.getItem(usersStorageKey);
    allUsers = stored ? JSON.parse(stored) : [];
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
    console.error('Error saving users to localStorage:', error);
    showToast('خطا در ذخیره کاربران', '❌');
  }
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('photo-preview').classList.remove('hidden');
      if (currentUser) {
        currentUser.tempPhoto = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function updateProfile(event) {
  event.preventDefault();
  const fullName = document.getElementById('profile-fullname').value.trim();
  const password = document.getElementById('profile-password').value;
  if (!fullName || !password) {
    showToast('لطفاً همه فیلدها را پر کنید', '⚠️');
    return;
  }
  if (!currentUser) {
    showToast('کاربر یافت نشد', '❌');
    return;
  }
  currentUser.fullName = fullName;
  currentUser.password = password;
  if (currentUser.tempPhoto) {
    currentUser.photo = currentUser.tempPhoto;
    delete currentUser.tempPhoto;
  }
  await saveUsers(allUsers);
  showToast('پروفایل با موفقیت به‌روزرسانی شد', '✅');
  setTimeout(() => navigateTo('./index.html'), 1500);
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

function navigateTo(path) {
  window.location.href = path;
}

function logout() {
  localStorage.removeItem('session');
  window.location.href = 'login.html';
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

async function initProfilePage() {
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) {
    window.location.href = 'login.html';
    return;
  }
  let session;
  try {
    session = JSON.parse(sessionStr);
  } catch (e) {
    localStorage.removeItem('session');
    window.location.href = 'login.html';
    return;
  }
  if (!session.loggedIn) {
    localStorage.removeItem('session');
    window.location.href = 'login.html';
    return;
  }
  await loadUsers();
  currentUser = allUsers.find(u => u.username === session.username);
  if (!currentUser) {
    localStorage.removeItem('session');
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('profile-fullname').value = currentUser.fullName || '';
  document.getElementById('profile-password').value = currentUser.password || '';
  const preview = document.getElementById('photo-preview');
  const previewImg = document.getElementById('preview-img');
  if (currentUser.photo) {
    previewImg.src = currentUser.photo;
    preview.classList.remove('hidden');
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);
}

document.addEventListener('DOMContentLoaded', initProfilePage);