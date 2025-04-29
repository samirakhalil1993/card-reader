// backend.js

// ========= Constants and DOM Selectors =========

// Modals
const modals = {
    addUser: document.getElementById('addUserModal'),
    removeUser: document.getElementById('removeUserModal'),
    updateUser: document.getElementById('updateUserModal'),
    schedule: document.getElementById('scheduleModal'),
    code: createCodeModal() // Dynamic creation
  };
  
  // Tables
  const usersTableBody = document.querySelector('#usersTable tbody');
  const addScheduleTableBody = document.querySelector('#addScheduleTable tbody');
  const updateScheduleTableBody = document.querySelector('#updateScheduleTable tbody');
  const scheduleTableBody = document.querySelector('#scheduleTable tbody');
  
  // Forms
  const addUserForm = document.getElementById('addUserForm');
  const updateUserForm = document.getElementById('updateUserForm');
  const removeUserForm = document.getElementById('removeUserForm');
  const searchForm = document.getElementById('searchForm');
  const searchInput = searchForm.elements['search'];
  
  // Buttons
  const showActiveUsersButton = document.getElementById('showActiveUsers');
  const showArchivedUsersButton = document.getElementById('showArchivedUsers');
  const showSuperUsersButton = document.getElementById('showSuperUsers');
  const saveScheduleButton = document.getElementById('saveScheduleButton');
  const archiveUserButton = document.getElementById('archiveUserButton');
  
  // State
  let currentFilter = null;
  let currentUserId = null;
  
  // ========= Utility Functions =========
  
  // Open modal
  function openModal(modal) {
    modal.style.display = 'block';
  }
  
  // Close modal
  function closeModal(modal) {
    modal.style.display = 'none';
  }
  
  // Fetch wrapper
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    return await response.json();
  }
  
  // Debounce helper
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  
  // Email validation (BTH specific)
  function validateBthEmail(email) {
    return /^[a-zA-Z]{4}\d{2}@student\.bth\.se$/.test(email);
  }
  
  // Create and append Code Modal
  function createCodeModal() {
    const codeModal = document.createElement('div');
    codeModal.id = 'codeModal';
    codeModal.className = 'modal';
    codeModal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Generated Code</h2>
        <div id="generatedCode" class="code-display"></div>
        <button id="copyCodeBtn">Copy Code</button>
      </div>`;
    document.body.appendChild(codeModal);
  
    // Add functionality
    codeModal.querySelector('.close').onclick = () => closeModal(codeModal);
    codeModal.querySelector('#copyCodeBtn').onclick = copyGeneratedCode;
  
    return codeModal;
  }
  
  // Copy generated code to clipboard
  function copyGeneratedCode() {
    const codeText = document.getElementById('generatedCode').textContent;
    navigator.clipboard.writeText(codeText)
      .then(() => alert('Code copied to clipboard!'))
      .catch(err => console.error('Clipboard error:', err));
  }
  
  // Generate a random 9-digit code
  function generateRandomCode() {
    return Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
  }
// ========= User Management =========

// Fetch all users
async function fetchUsers(searchTerm = '', filter = null) {
    try {
      let url = '/review_users';
      const params = new URLSearchParams();
      if (searchTerm) params.append('name', searchTerm);
      if (filter === 0 || filter === 1) params.append('is_active', filter);
      if (currentFilter === 'super_users') params.append('is_super_user', true);
  
      if (params.toString()) url += `?${params.toString()}`;
  
      const users = await fetchJson(url);
      renderUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }
  
  // Open Update User Modal by fetching user data
async function openUpdateUserModal(userId) {
    try {
      const response = await fetchJson(`/review_users?user_id=${userId}`);
      const users = Array.isArray(response) ? response : [response];
  
      if (users.length > 0) {
        const user = users[0];
        fillUpdateUserModal(user);
        openModal(modals.updateUser);
      } else {
        alert('User not found');
      }
    } catch (error) {
      console.error('Error fetching user for update:', error);
    }
  }
  function fillUpdateUserModal(user) {
    updateUserForm.elements['updateName'].value = user.name;
    updateUserForm.elements['updateEmail'].value = user.email;
    updateUserForm.elements['updateUserId'].value = user.user_id;
    updateUserForm.elements['updateProgram'].value = user.program;
    updateUserForm.elements['updateIsSuperUser'].checked = user.is_super_user || false;
  
    populateUpdateScheduleTable(user.schedules || {});
  
    // Set archive/activate button text and style
    if (user.is_active) {
      archiveUserButton.textContent = "Archive User";
      archiveUserButton.classList.remove("activate-button");
      archiveUserButton.classList.add("delete-button");
    } else {
      archiveUserButton.textContent = "Activate User";
      archiveUserButton.classList.remove("delete-button");
      archiveUserButton.classList.add("activate-button");
    }
  
    // Remove any previous click handlers first
    const newButton = archiveUserButton.cloneNode(true);
    archiveUserButton.parentNode.replaceChild(newButton, archiveUserButton);
  
    // Attach new click handler
    newButton.addEventListener('click', async () => {
      const confirmed = confirm(`Are you sure you want to ${user.is_active ? 'archive' : 'reactivate'} this user?`);
      if (!confirmed) return;
  
      try {
        const endpoint = user.is_active ? '/archive_user' : '/reactivate_user';
        const response = await fetchJson(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.user_id })
        });
  
        if (response.message) {
          alert(response.message);
          closeModal(modals.updateUser);
          fetchUsers(); // Refresh the list
        } else {
          alert(response.error || `Failed to ${user.is_active ? 'archive' : 'reactivate'} user`);
        }
      } catch (error) {
        console.error('Error archiving/reactivating user:', error);
        alert('Network error');
      }
    });
  }
  
  // Fetch only superusers
  async function fetchSuperUsers() {
    currentFilter = 'super_users';
    try {
      const users = await fetchJson('/review_users?is_super_user=true');
      renderUsers(users);
    } catch (error) {
      console.error('Error fetching superusers:', error);
    }
  }
  
  // Render user table
  function renderUsers(users) {
    usersTableBody.innerHTML = "";
  
    if (!users.length) {
      usersTableBody.innerHTML = `<tr><td colspan="8">No users found</td></tr>`;
      return;
    }
  
    users.forEach(user => {
      const row = usersTableBody.insertRow();
  
      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.user_id}</td>
        <td>${user.program}</td>
        <td>${user.is_active ? 'Has Access' : `Archived: ${formatArchivedDate(user.archived_date)}`}</td>
        <td>${user.is_active ? (user.expiration_time || '') : ''}</td>
        <td class="schedules-cell"></td>
        <td><button class="generate-code-btn" data-userid="${user.user_id}">Generate Code</button></td>
      `;
  
      renderScheduleHover(row.querySelector('.schedules-cell'), user.schedules);
    });
  }
  
  // Format archived date
  function formatArchivedDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  }
  
  // Add "View Schedule" hover functionality
  function renderScheduleHover(cell, schedules) {
    const viewDiv = document.createElement('div');
    viewDiv.className = 'view-schedule-box';
    viewDiv.textContent = 'View Schedule';
  
    const scheduleBox = document.createElement('div');
    scheduleBox.className = 'schedule-box';
    scheduleBox.style.display = 'none';
  
    if (schedules && Object.keys(schedules).length > 0) {
      const scheduleList = document.createElement('ul');
      const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
      dayOrder.forEach(day => {
        if (schedules[day]) {
          const listItem = document.createElement('li');
          listItem.innerHTML = `<strong>${day}:</strong> ${schedules[day].join(', ')}`;
          scheduleList.appendChild(listItem);
        }
      });
  
      scheduleBox.appendChild(scheduleList);
    } else {
      scheduleBox.textContent = 'No scheduling periods selected';
    }
  
    viewDiv.addEventListener('mouseover', () => {
      scheduleBox.style.display = 'block';
    });
  
    viewDiv.addEventListener('mouseout', () => {
      scheduleBox.style.display = 'none';
    });
  
    cell.appendChild(viewDiv);
    cell.appendChild(scheduleBox);
  }
  
  // Update a user's schedule column dynamically after update
  function updateScheduleColumn(userId, newSchedules) {
    const rows = Array.from(usersTableBody.querySelectorAll('tr'));
    rows.forEach(row => {
      if (row.cells[2].textContent.trim() === userId) {
        const schedulesCell = row.querySelector('.schedules-cell');
        schedulesCell.innerHTML = '';
        renderScheduleHover(schedulesCell, newSchedules);
      }
    });
  }
// ========= Schedule Management =========

// Periods and Days
const periods = ["08:00 - 12:00", "12:00 - 16:00", "16:00 - 20:00", "20:00 - 23:00"];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Populate Add User Schedule Table
function populateAddScheduleTable() {
  addScheduleTableBody.innerHTML = "";

  daysOfWeek.forEach(day => {
    const row = addScheduleTableBody.insertRow();
    renderScheduleRow(row, day, 'add');
  });
}

// Populate Update User Schedule Table
function populateUpdateScheduleTable(existingSchedules = {}) {
  updateScheduleTableBody.innerHTML = "";

  daysOfWeek.forEach(day => {
    const row = updateScheduleTableBody.insertRow();
    renderScheduleRow(row, day, 'update', existingSchedules[day] || []);
  });
}

// Helper to Render a Row of Schedule Checkboxes
function renderScheduleRow(row, day, mode, checkedPeriods = []) {
  const tableBody = (mode === 'add') ? addScheduleTableBody : updateScheduleTableBody;

  // Select all cell
  const selectAllCell = row.insertCell();
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'select-all-btn';
  selectAllBtn.dataset.day = day;
  selectAllBtn.title = `Toggle all periods for ${day}`;
  selectAllBtn.textContent = areAllPeriodsSelected(checkedPeriods) ? '✓' : '';

  selectAllBtn.onclick = () => toggleAllPeriods(row, selectAllBtn);

  selectAllCell.appendChild(selectAllBtn);

  // Day name cell
  const dayCell = row.insertCell();
  dayCell.textContent = day;

  // Period checkboxes
  periods.forEach(period => {
    const cell = row.insertCell();
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.day = day;
    checkbox.dataset.period = period;
    checkbox.checked = checkedPeriods.includes(period);

    checkbox.addEventListener('change', () => {
      const allChecked = isAllCheckedInRow(row);
      selectAllBtn.textContent = allChecked ? '✓' : '';
    });

    cell.appendChild(checkbox);
  });
}

// Check if all periods are selected
function areAllPeriodsSelected(checkedPeriods) {
  return periods.every(period => checkedPeriods.includes(period));
}

// Toggle all periods in a row
function toggleAllPeriods(row, button) {
  const checkboxes = row.querySelectorAll('input[type="checkbox"]');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  checkboxes.forEach(cb => cb.checked = !allChecked);

  button.textContent = allChecked ? '' : '✓';
}

// Check if all checkboxes in a row are checked
function isAllCheckedInRow(row) {
  const checkboxes = row.querySelectorAll('input[type="checkbox"]');
  return Array.from(checkboxes).every(cb => cb.checked);
}

// Collect Schedule Data (Add/Update form)
function collectScheduleData(mode) {
  const tableBody = (mode === 'add') ? addScheduleTableBody : updateScheduleTableBody;
  const schedule = {};

  const checkboxes = tableBody.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      const day = checkbox.dataset.day;
      const period = checkbox.dataset.period;
      if (!schedule[day]) schedule[day] = [];
      schedule[day].push(period);
    }
  });

  return schedule;
}

// Fetch and Show Full Schedule for a User (dblclick row)
async function fetchUserSchedule(userId) {
  currentUserId = userId;
  try {
    const schedule = await fetchJson(`/get_user_schedule/${userId}`);
    renderFullSchedule(schedule);
    openModal(modals.schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

// Render Full Schedule Modal Table
function renderFullSchedule(schedule) {
  scheduleTableBody.innerHTML = "";

  daysOfWeek.forEach(day => {
    const row = scheduleTableBody.insertRow();
    const dayCell = row.insertCell();
    dayCell.textContent = day;

    periods.forEach(period => {
      const cell = row.insertCell();
      const checked = schedule[day]?.includes(period);
      cell.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} data-day="${day}" data-period="${period}">`;
    });
  });
}

// Save Full Schedule (after editing in schedule modal)
async function saveUserSchedule() {
  const updatedSchedule = {};

  const checkboxes = scheduleTableBody.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      const day = checkbox.dataset.day;
      const period = checkbox.dataset.period;
      if (!updatedSchedule[day]) updatedSchedule[day] = [];
      updatedSchedule[day].push(period);
    }
  });

  try {
    const response = await fetchJson(`/update_user_schedule/${currentUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules: updatedSchedule })
    });

    if (response.message) {
      alert(response.message);
      closeModal(modals.schedule);
      updateScheduleColumn(currentUserId, updatedSchedule);
    } else {
      alert(response.error || 'Failed to save schedule');
    }
  } catch (error) {
    console.error('Error saving schedule:', error);
  }
}
// ========= Modal Handling =========

// Attach close event for all modal close buttons
function setupModalClosers() {
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
      const modal = closeBtn.closest('.modal');
      closeBtn.onclick = () => closeModal(modal);
    });
  
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      Object.values(modals).forEach(modal => {
        if (e.target === modal) closeModal(modal);
      });
    });
  }
  
  // ========= Code Generation Handling =========
  
  // Handle Generate Code button click
  async function handleCodeGeneration(userId) {
    const randomCode = generateRandomCode();
    document.getElementById('generatedCode').textContent = randomCode;
    openModal(modals.code);
  
    try {
      const response = await fetchJson('/update_code_timestamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, random_code: randomCode })
      });
  
      if (!response.message) {
        console.error('Error updating timestamp:', response.error);
      }
    } catch (error) {
      console.error('Error sending code to server:', error);
    }
  }
  
  // ========= Event Bindings =========
  
  function setupEventListeners() {
    // Add User Modal open
    document.getElementById('addUserBox').addEventListener('click', () => {
      populateAddScheduleTable();
      openModal(modals.addUser);
    });
  
    // Remove User Modal open
    document.getElementById('removeUserBox').addEventListener('click', () => {
      openModal(modals.removeUser);
    });
  
    // Search input (with debounce)
    searchInput.addEventListener('input', debounce(() => {
      fetchUsers(searchInput.value, currentFilter);
    }, 300));
  
    // Filter Buttons
    showActiveUsersButton.addEventListener('click', () => {
      currentFilter = (currentFilter === 1) ? null : 1;
      updateFilterButtons();
      fetchUsers(searchInput.value, currentFilter);
    });
  
    showArchivedUsersButton.addEventListener('click', () => {
      currentFilter = (currentFilter === 0) ? null : 0;
      updateFilterButtons();
      fetchUsers(searchInput.value, currentFilter);
    });
  
    showSuperUsersButton.addEventListener('click', () => {
      currentFilter = (currentFilter === 'super_users') ? null : 'super_users';
      updateFilterButtons();
      if (currentFilter === 'super_users') {
        fetchSuperUsers();
      } else {
        fetchUsers(searchInput.value, null);
      }
    });
  
    // Save Schedule Button (in schedule modal)
    saveScheduleButton.addEventListener('click', saveUserSchedule);
  
    // User table interactions (event delegation)
    usersTableBody.addEventListener('click', async (e) => {
      if (e.target.classList.contains('generate-code-btn')) {
        const userId = e.target.dataset.userid;
        await handleCodeGeneration(userId);
        e.stopPropagation(); // Prevent opening the edit modal
      }
    });
  
    // Double-click to edit schedules
    usersTableBody.addEventListener('dblclick', async (e) => {
      const row = e.target.closest('tr');
      if (row) {
        const userId = row.cells[2].textContent.trim();
        await fetchUserSchedule(userId);
      }
    });
  
    // Single click row to edit user
    usersTableBody.addEventListener('click', async (e) => {
      const row = e.target.closest('tr');
      if (row && !e.target.classList.contains('generate-code-btn')) {
        const userId = row.cells[2].textContent.trim();
        await openUpdateUserModal(userId);
      }
    });
  }
  
  // Update filter buttons UI
  function updateFilterButtons() {
    showActiveUsersButton.classList.toggle('active', currentFilter === 1);
    showArchivedUsersButton.classList.toggle('active', currentFilter === 0);
    showSuperUsersButton.classList.toggle('active', currentFilter === 'super_users');
  }
  
  // ========= Form Submissions =========
  
  // Add User Form
  addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const formData = {
      name: addUserForm.elements['name'].value.trim(),
      email: addUserForm.elements['email'].value.trim().toLowerCase(),
      user_id: addUserForm.elements['user_id'].value.trim(),
      program: addUserForm.elements['program'].value.trim(),
      schedules: collectScheduleData('add'),
      is_super_user: addUserForm.elements['is_super_user'].checked
    };
  
    if (!validateBthEmail(formData.email)) {
      alert('Invalid email address. Only BTH email addresses are allowed.');
      return;
    }
  
    try {
      const response = await fetchJson('/add_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
  
      if (response.message) {
        alert(response.message);
        fetchUsers();
        addUserForm.reset();
        closeModal(modals.addUser);
      } else {
        alert(response.error || 'Something went wrong!');
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    }
  });
  
  // Remove User Form
  removeUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const userId = removeUserForm.elements['user_id'].value.trim();
  
    if (!confirm('Are you sure you want to archive this user?')) return;
  
    try {
      const response = await fetchJson('/archive_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
  
      if (response.message) {
        alert(response.message);
        fetchUsers();
        removeUserForm.reset();
        closeModal(modals.removeUser);
      } else {
        alert(response.error || 'Failed to archive user');
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    }
  });
  
  // Update User Form
  updateUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const formData = {
      name: updateUserForm.elements['updateName'].value.trim(),
      email: updateUserForm.elements['updateEmail'].value.trim().toLowerCase(),
      user_id: updateUserForm.elements['updateUserId'].value.trim(),
      program: updateUserForm.elements['updateProgram'].value.trim(),
      schedules: collectScheduleData('update'),
      is_super_user: updateUserForm.elements['updateIsSuperUser'].checked
    };
  
    try {
      const response = await fetchJson('/update_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
  
      if (response.message) {
        alert('User updated successfully!');
        closeModal(modals.updateUser);
        updateScheduleColumn(formData.user_id, formData.schedules);
        fetchUsers();
      } else {
        alert(response.error || 'Failed to update user');
      }
    } catch (error) {
      alert('An error occurred while updating the user');
    }
  });
// ========= Initialization =========

async function init() {
    setupModalClosers();
    setupEventListeners();
    await fetchUsers(); // Load users on page load
  }
  
  // Launch the app
  document.addEventListener('DOMContentLoaded', init);
        