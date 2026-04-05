/* =============================================
   FULL-STACK SPA - script.js
   Integrated with TypeScript Backend (Port 4000)
   ============================================= */
'use strict';

// ─── API BASE URL ────────────────────────────────────────────────────────────
const API_BASE = '/api';
const USERS_API = '/users';

// ─── GLOBALS ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ipt_demo_v2';
let currentUser = null;
window.db = { departments: [], employees: [], requests: [] };

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      window.db = JSON.parse(raw);
    } else {
      seedLocalData();
    }
  } catch (e) {
    seedLocalData();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function seedLocalData() {
  window.db = {
    departments: [
      { id: 'dept-1', name: 'Engineering', description: 'Software team' },
      { id: 'dept-2', name: 'HR', description: 'Human Resources' }
    ],
    employees: [],
    requests: []
  };
  saveToStorage();
}

// ─── AUTH STATE ───────────────────────────────────────────────────────────────
function setAuthState(isAuth, user = null) {
  currentUser = user;
  const body = document.body;
  if (isAuth && user) {
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');
    body.classList.toggle('is-admin', user.role === 'Admin');
    const navName = document.getElementById('nav-username');
    if (navName) navName.textContent = user.firstName + ' ' + user.lastName;
  } else {
    body.classList.remove('authenticated', 'is-admin');
    body.classList.add('not-authenticated');
  }
}

function checkSavedSession() {
  const token = sessionStorage.getItem('token');
  const userData = sessionStorage.getItem('user_data');
  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      setAuthState(true, user);
      return true;
    } catch (e) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user_data');
    }
  }
  return false;
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────
function getAuthHeader() {
  const token = sessionStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };
  
  const response = await fetch(endpoint, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  
  return data;
}

// ─── ROUTING ─────────────────────────────────────────────────────────────────
const PROTECTED_ROUTES = ['#/profile', '#/requests'];
const ADMIN_ROUTES     = ['#/employees', '#/departments', '#/accounts'];

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = window.location.hash || '#/';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  if (PROTECTED_ROUTES.includes(hash) && !currentUser) {
    navigateTo('#/login');
    showToast('Please log in to continue.', 'warning');
    return;
  }
  if (ADMIN_ROUTES.includes(hash) && (!currentUser || currentUser.role !== 'Admin')) {
    navigateTo('#/');
    showToast('Admin access required.', 'error');
    return;
  }

  const routeMap = {
    '#/': 'home-page',
    '#/register': 'register-page',
    '#/login': 'login-page',
    '#/profile': 'profile-page',
    '#/employees': 'employees-page',
    '#/departments': 'departments-page',
    '#/accounts': 'accounts-page',
    '#/requests': 'requests-page'
  };

  const pageId = routeMap[hash] || 'home-page';
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  if (hash === '#/profile')     renderProfile();
  if (hash === '#/employees')   renderEmployeesTable();
  if (hash === '#/departments') renderDepartmentsTable();
  if (hash === '#/accounts')    renderAccountsList();
  if (hash === '#/requests')    renderRequestsTable();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = 'toast-item ' + type;
  toast.textContent = (icons[type] || '') + ' ' + message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove('d-none');
}
function hideFormError(el) {
  el.classList.add('d-none');
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
function initRegister() {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('reg-fname').value.trim();
    const lastName  = document.getElementById('reg-lname').value.trim();
    const email     = document.getElementById('reg-email').value.trim().toLowerCase();
    const password  = document.getElementById('reg-password').value;
    const errEl     = document.getElementById('reg-error');
    hideFormError(errEl);

    if (!firstName || !lastName || !email || !password) {
      return showFormError(errEl, 'All fields are required.');
    }
    if (password.length < 6) {
      return showFormError(errEl, 'Password must be at least 6 characters.');
    }

    try {
      await apiRequest(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify({ 
          firstName, 
          lastName, 
          email, 
          password,
          title: 'Mr'
        })
      });

      document.getElementById('register-form').reset();
      showToast('Registration successful! Please login.', 'success');
      navigateTo('#/login');
    } catch (err) {
      showFormError(errEl, err.message || 'Registration failed.');
    }
  });
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function initLogin() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    hideFormError(errEl);

    if (!email || !password) {
      return showFormError(errEl, 'Email and password are required.');
    }

    try {
      const data = await apiRequest(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Store token and user data
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user_data', JSON.stringify(data.user));
      
      setAuthState(true, data.user);
      document.getElementById('login-form').reset();
      showToast('Welcome back, ' + data.user.firstName + '!', 'success');
      navigateTo('#/profile');
    } catch (err) {
      showFormError(errEl, err.message || 'Invalid email or password.');
    }
  });
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function initLogout() {
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user_data');
    setAuthState(false);
    showToast('Logged out.', 'info');
    navigateTo('#/');
  });
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
function renderProfile() {
  if (!currentUser) return;
  const u = currentUser;
  document.getElementById('profile-content').innerHTML = `
    <div class="profile-name">${u.firstName} ${u.lastName}</div>
    <div class="profile-detail"><strong>Email:</strong> ${u.email}</div>
    <div class="profile-detail"><strong>Role:</strong> ${capitalize(u.role)}</div>
    <div class="mt-3">
      <button class="btn-outline-custom" onclick="showToast('Edit Profile coming soon!','info')">Edit Profile</button>
    </div>
  `;
}

// ─── ACCOUNTS (admin) - Fetches from backend ─────────────────────────────────
async function renderAccountsList() {
  const tbody = document.getElementById('accounts-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Loading...</td></tr>';
  
  try {
    const accounts = await apiRequest(USERS_API);
    tbody.innerHTML = '';
    
    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No accounts found.</td></tr>';
      return;
    }
    
    accounts.forEach((acc) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${acc.firstName} ${acc.lastName}</td>
        <td>${acc.email}</td>
        <td>${capitalize(acc.role)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-edit-sm" onclick="openEditAccount(${acc.id})">Edit</button>
            <button class="btn-danger-sm" onclick="deleteAccount(${acc.id})">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Failed to load accounts.</td></tr>';
    showToast('Error loading accounts: ' + err.message, 'error');
  }
}

function initAccountForm() {
  document.getElementById('open-add-account-btn').addEventListener('click', () => {
    document.getElementById('account-form-title').textContent = 'Add Account';
    document.getElementById('acc-edit-id').value = '';
    document.getElementById('account-form').reset();
    document.getElementById('acc-password').required = true;
    document.getElementById('account-form-panel').classList.remove('d-none');
    document.getElementById('account-form-panel').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('cancel-account-btn').addEventListener('click', () => {
    document.getElementById('account-form-panel').classList.add('d-none');
  });

  document.getElementById('account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id        = document.getElementById('acc-edit-id').value;
    const firstName = document.getElementById('acc-fname').value.trim();
    const lastName  = document.getElementById('acc-lname').value.trim();
    const email     = document.getElementById('acc-email').value.trim().toLowerCase();
    const password  = document.getElementById('acc-password').value;
    const role      = document.getElementById('acc-role').value;

    if (!firstName || !lastName || !email) { 
      showToast('Name and email are required.', 'error'); 
      return; 
    }

    try {
      if (id === '') {
        // Create new account
        if (!password || password.length < 6) { 
          showToast('Password must be at least 6 characters.', 'error'); 
          return; 
        }
        await apiRequest(USERS_API, {
          method: 'POST',
          body: JSON.stringify({ 
            title: 'Mr',
            firstName, 
            lastName, 
            email, 
            password,
            confirmPassword: password,
            role 
          })
        });
        showToast('Account created.', 'success');
      } else {
        // Update existing account
        const updateData = { firstName, lastName, email, role, title: 'Mr' };
        if (password && password.length >= 6) {
          updateData.password = password;
          updateData.confirmPassword = password;
        }
        await apiRequest(`${USERS_API}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });
        showToast('Account updated.', 'success');
      }
      
      document.getElementById('account-form-panel').classList.add('d-none');
      renderAccountsList();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });
}

async function openEditAccount(id) {
  try {
    const acc = await apiRequest(`${USERS_API}/${id}`);
    document.getElementById('account-form-title').textContent = 'Edit Account';
    document.getElementById('acc-edit-id').value = id;
    document.getElementById('acc-fname').value = acc.firstName;
    document.getElementById('acc-lname').value = acc.lastName;
    document.getElementById('acc-email').value = acc.email;
    document.getElementById('acc-password').value = '';
    document.getElementById('acc-password').required = false;
    document.getElementById('acc-role').value = acc.role;
    document.getElementById('account-form-panel').classList.remove('d-none');
    document.getElementById('account-form-panel').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Error loading account: ' + err.message, 'error');
  }
}

async function deleteAccount(id) {
  if (currentUser && currentUser.id === id) { 
    showToast('Cannot delete your own account.', 'error'); 
    return; 
  }
  if (!confirm('Delete this account?')) return;
  
  try {
    await apiRequest(`${USERS_API}/${id}`, { method: 'DELETE' });
    renderAccountsList();
    showToast('Account deleted.', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ─── DEPARTMENTS (admin) - Local storage ──────────────────────────────────────
function renderDepartmentsTable() {
  const tbody = document.getElementById('departments-tbody');
  tbody.innerHTML = '';
  if (window.db.departments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="table-empty">No departments found.</td></tr>';
    return;
  }
  window.db.departments.forEach((dept, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dept.name}</td>
      <td>${dept.description || '—'}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit-sm" onclick="openEditDept(${idx})">Edit</button>
          <button class="btn-danger-sm" onclick="deleteDepartment(${idx})">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function initDepartmentForm() {
  document.getElementById('open-add-dept-btn').addEventListener('click', () => {
    document.getElementById('dept-form').reset();
    document.getElementById('dept-form-panel').classList.remove('d-none');
    document.getElementById('dept-form-panel').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('cancel-dept-btn').addEventListener('click', () => {
    document.getElementById('dept-form-panel').classList.add('d-none');
  });
  document.getElementById('dept-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('dept-name').value.trim();
    const desc = document.getElementById('dept-desc').value.trim();
    if (!name) { showToast('Department name is required.', 'error'); return; }
    window.db.departments.push({ id: 'dept-' + Date.now(), name, description: desc });
    saveToStorage();
    document.getElementById('dept-form').reset();
    document.getElementById('dept-form-panel').classList.add('d-none');
    renderDepartmentsTable();
    showToast('Department added.', 'success');
  });
}

function openEditDept(idx) {
  const dept = window.db.departments[idx];
  document.getElementById('dept-name').value = dept.name;
  document.getElementById('dept-desc').value = dept.description || '';
  document.getElementById('dept-form-panel').classList.remove('d-none');
  document.getElementById('dept-form').onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById('dept-name').value.trim();
    const desc = document.getElementById('dept-desc').value.trim();
    if (!name) { showToast('Name required.', 'error'); return; }
    window.db.departments[idx].name = name;
    window.db.departments[idx].description = desc;
    saveToStorage();
    document.getElementById('dept-form-panel').classList.add('d-none');
    renderDepartmentsTable();
    showToast('Department updated.', 'success');
    initDepartmentForm();
  };
  document.getElementById('dept-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function deleteDepartment(idx) {
  if (!confirm('Delete this department?')) return;
  window.db.departments.splice(idx, 1);
  saveToStorage();
  renderDepartmentsTable();
  showToast('Department deleted.', 'success');
}

// ─── EMPLOYEES (admin) - Local storage ────────────────────────────────────────
function renderEmployeesTable() {
  const tbody = document.getElementById('employees-tbody');
  tbody.innerHTML = '';
  if (window.db.employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No employees.</td></tr>';
    return;
  }
  window.db.employees.forEach((emp, idx) => {
    const dept = window.db.departments.find(d => d.id === emp.deptId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.employeeId}</td>
      <td>${emp.name || emp.userEmail}</td>
      <td>${emp.position}</td>
      <td>${dept ? dept.name : '—'}</td>
      <td>${emp.hireDate || '—'}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-danger-sm" onclick="deleteEmployee(${idx})">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateDeptDropdown() {
  const select = document.getElementById('emp-dept');
  select.innerHTML = '<option value="">— Select —</option>';
  window.db.departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id; opt.textContent = d.name;
    select.appendChild(opt);
  });
}

function initEmployeeForm() {
  document.getElementById('open-add-employee-btn').addEventListener('click', () => {
    document.getElementById('employee-form-title').textContent = 'Add/Edit Employee';
    document.getElementById('emp-edit-index').value = '';
    document.getElementById('employee-form').reset();
    populateDeptDropdown();
    document.getElementById('employee-form-panel').classList.remove('d-none');
    document.getElementById('employee-form-panel').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('cancel-employee-btn').addEventListener('click', () => {
    document.getElementById('employee-form-panel').classList.add('d-none');
  });

  document.getElementById('employee-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const employeeId = document.getElementById('emp-id').value.trim();
    const userEmail  = document.getElementById('emp-email').value.trim().toLowerCase();
    const position   = document.getElementById('emp-position').value.trim();
    const deptId     = document.getElementById('emp-dept').value;
    const hireDate   = document.getElementById('emp-hire-date').value;

    if (!employeeId || !userEmail || !position || !deptId) { 
      showToast('All fields required.', 'error'); 
      return; 
    }

    window.db.employees.push({ 
      employeeId, 
      userEmail, 
      name: userEmail,
      position, 
      deptId, 
      hireDate 
    });
    saveToStorage();
    document.getElementById('employee-form-panel').classList.add('d-none');
    renderEmployeesTable();
    showToast('Employee added.', 'success');
  });
}

function deleteEmployee(idx) {
  if (!confirm('Remove this employee record?')) return;
  window.db.employees.splice(idx, 1);
  saveToStorage();
  renderEmployeesTable();
  showToast('Employee removed.', 'success');
}

// ─── REQUESTS - Local storage ─────────────────────────────────────────────────
function addItemRow() {
  const container = document.getElementById('req-items-container');
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" class="form-control item-name" placeholder="Item name" />
    <input type="number" class="form-control item-qty qty-input" placeholder="Qty" min="1" value="1" />
    <button type="button" class="remove-item-btn" onclick="this.closest('.item-row').remove()">×</button>
  `;
  container.appendChild(row);
}

function renderRequestsTable() {
  const tbody    = document.getElementById('requests-tbody');
  const emptyDiv = document.getElementById('requests-empty');
  tbody.innerHTML = '';

  if (!currentUser) return;
  const myRequests = window.db.requests.filter(r => r.employeeEmail === currentUser.email);

  if (myRequests.length === 0) {
    emptyDiv.classList.remove('d-none');
    return;
  }
  emptyDiv.classList.add('d-none');

  myRequests.forEach(req => {
    const badgeClass = { Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected' }[req.status] || 'badge-pending';
    const itemsText = req.items.map(i => i.name + ' ×' + i.qty).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${req.date}</td>
      <td>${req.type}</td>
      <td style="max-width:200px">${itemsText}</td>
      <td><span class="badge-status ${badgeClass}">${req.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function initRequests() {
  document.getElementById('open-request-btn').addEventListener('click', () => {
    document.getElementById('request-form').reset();
    document.getElementById('req-items-container').innerHTML = '';
    document.getElementById('req-error').classList.add('d-none');
    addItemRow();
    document.getElementById('request-modal-overlay').classList.remove('d-none');
  });

  document.getElementById('close-request-modal').addEventListener('click', () => {
    document.getElementById('request-modal-overlay').classList.add('d-none');
  });

  document.getElementById('request-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('request-modal-overlay')) {
      document.getElementById('request-modal-overlay').classList.add('d-none');
    }
  });

  document.getElementById('add-item-btn').addEventListener('click', addItemRow);

  document.getElementById('request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type  = document.getElementById('req-type').value;
    const errEl = document.getElementById('req-error');
    errEl.classList.add('d-none');

    const nameInputs = document.querySelectorAll('#req-items-container .item-name');
    const qtyInputs  = document.querySelectorAll('#req-items-container .item-qty');
    const items = [];
    nameInputs.forEach((nameEl, i) => {
      const name = nameEl.value.trim();
      const qty  = parseInt(qtyInputs[i].value) || 1;
      if (name) items.push({ name, qty });
    });

    if (items.length === 0) {
      errEl.textContent = 'Please add at least one item.';
      errEl.classList.remove('d-none');
      return;
    }

    window.db.requests.push({
      type, items, status: 'Pending',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      employeeEmail: currentUser.email
    });
    saveToStorage();
    document.getElementById('request-modal-overlay').classList.add('d-none');
    renderRequestsTable();
    showToast('Request submitted!', 'success');
  });
}

// ─── UTIL ─────────────────────────────────────────────────────────────────────
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  loadFromStorage();
  checkSavedSession();

  initRegister();
  initLogin();
  initLogout();
  initAccountForm();
  initDepartmentForm();
  initEmployeeForm();
  initRequests();

  window.addEventListener('hashchange', handleRouting);

  if (!window.location.hash) {
    window.location.hash = '#/';
  } else {
    handleRouting();
  }
}

document.addEventListener('DOMContentLoaded', init);
