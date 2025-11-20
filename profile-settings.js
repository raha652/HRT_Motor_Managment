const usersStorageKey = 'userAccountsData';
let allUsers = [];
let currentUser = null;

async function loadUsers() {
  try {
    const stored = localStorage.getItem(usersStorageKey);
    allUsers = stored && stored !== 'undefined' ? JSON.parse(stored) : [];
    return allUsers;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    localStorage.setItem(usersStorageKey, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
    showToast('خطا در ذخیره کاربران', '❌');
  }
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function updateProfile(event) {
  event.preventDefault();

  const fullName = document.getElementById('profile-fullname').value.trim();
  const newPassword = document.getElementById('profile-password').value;
  const photoInput = document.getElementById('profile-photo');

  if (!fullName) {
    showToast('نام کامل الزامی است', '⚠️');
    return;
  }

  if (!currentUser) {
    showToast('کاربر یافت نشد', '❌');
    return;
  }

  // آپدیت کاربر
  currentUser.fullName = fullName;
  if (newPassword) currentUser.password = newPassword;

  if (photoInput.files[0]) {
    const photoBase64 = await readFileAsBase64(photoInput.files[0]);
    currentUser.photo = photoBase64;
  }

  // ذخیره در allUsers
  const userIndex = allUsers.findIndex(u => u.__backendId === currentUser.__backendId);
  if (userIndex !== -1) allUsers[userIndex] = currentUser;
  await saveUsers(allUsers);

  // آپدیت session (اینجا درست شد!)
  let session = JSON.parse(localStorage.getItem('session') || '{}');
  session.fullName = fullName;
  session.photo = currentUser.photo || '';  // ذخیره عکس در session
  localStorage.setItem('session', JSON.stringify(session));

  showToast('پروفایل با موفقیت به‌روزرسانی شد!', '✅');
  setTimeout(() => navigateTo('./index.html'), 1500);
}

// فشرده‌سازی عکس
function readFileAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const maxSize = 600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-message').textContent = message;
  document.getElementById('toast-icon').textContent = icon;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function navigateTo(path) {
  window.location.href = path;
}
function logout() {
  localStorage.removeItem('session');
  navigateTo('./login.html');  // درست شد!
}

function updateDateTime() {
  const now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('fa-IR');
}

async function initProfilePage() {
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) return navigateTo('./login.html');

  let session;
  try { session = JSON.parse(sessionStr); } catch { return navigateTo('./login.html'); }

  if (!session.loggedIn) return navigateTo('./login.html');

  await loadUsers();
  currentUser = allUsers.find(u => u.username === session.username);
  if (!currentUser) return navigateTo('./login.html');

  document.getElementById('profile-fullname').value = currentUser.fullName || '';
  document.getElementById('profile-password').value = '';

  if (currentUser.photo) {
    document.getElementById('preview-img').src = currentUser.photo;
    document.getElementById('photo-preview').classList.remove('hidden');
  }

  updateDateTime();
  setInterval(updateDateTime, 60000);
}

document.addEventListener('DOMContentLoaded', initProfilePage);




