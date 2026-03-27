let usersData = [];
let currentEditingUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
});

async function loadUsers() {
    try {
        console.log('Fetching users from:', API_BASE_URL + '/users');
        usersData = await UserAPI.getAll();
        console.log('Users data:', usersData);
        renderUsers(usersData);
    } catch (err) {
        console.error('Error loading users:', err);
        alert('Failed to load users: ' + err.message);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        const dateObj = new Date(user.created_at);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

        console.log('User data:', user); // Debug role
        const userRole = user.role || 'N/A';
        const gradient = userRole === 'admin' ? 'linear-gradient(135deg, #772ca5 0%, #ab47bc 100%)' : 'linear-gradient(135deg, #03a9f4 0%, #29b6f6 100%)';
        const statusDot = user.is_online ? '<span class="status-dot online" style="margin-right: 8px;"></span>' : '<span class="status-dot" style="margin-right: 8px;"></span>';
        tr.innerHTML = `
            <td style="font-weight: 600; display: flex; align-items: center;">${statusDot} ${user.username}</td>
            <td style="padding: 0;"><span style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: ${gradient}; color: white; border-radius: 50px; font-weight: 700; font-size: 14px; text-transform: capitalize; text-shadow: 0 1px 2px rgba(0,0,0,0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2); white-space: nowrap; transition: all 0.3s ease;">${userRole}</span></td>
            <td>${formattedDate}</td>
            <td>
                <div style="display: flex; gap: 10px;align-items: center; justify-content: center;">
                    <button class="edit-btn" onclick="editUser(${user.id})" style="background: none; border: none; color: #1565c0; cursor: pointer; font-size: 1.1rem;"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="delete-btn" onclick="deleteUser(${user.id})" style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: 1.1rem;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupEventListeners() {
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = usersData.filter(u => u.username.toLowerCase().includes(query));
            renderUsers(filtered);
        });
    }

    // Enter key submission
    ['#addUsername', '#addPassword', '#addRole'].forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.addEventListener('keydown', e => { if(e.key === 'Enter') saveUser(); });
    });
    
    ['#editUsername', '#editPassword', '#editRole'].forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.addEventListener('keydown', e => { if(e.key === 'Enter') updateUser(); });
    });
}

function togglePopup() {
    document.getElementById('backdrop').classList.add('active');
    document.getElementById('popup').classList.add('active');
    document.getElementById('content1').classList.add('active');
    document.getElementById('content2').classList.remove('active');
    
    document.getElementById('addUsername').value = '';
    document.getElementById('addPassword').value = '';
    document.getElementById('addRole').value = 'staff';
}

function closePopup() {
    document.getElementById('backdrop').classList.remove('active');
    document.getElementById('popup').classList.remove('active');
    document.getElementById('content1').classList.remove('active');
    document.getElementById('content2').classList.remove('active');
    currentEditingUserId = null;
}

async function saveUser() {
    const username = document.getElementById('addUsername').value.trim();
    const password = document.getElementById('addPassword').value.trim();
    const role = document.getElementById('addRole').value;

    if (!username || !password) {
        alert('All fields are required');
        return;
    }

    try {
        await UserAPI.create({ username, password, role });
        closePopup();
        loadUsers();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function editUser(id) {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    currentEditingUserId = id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editPassword').value = ''; // Don't show password
    document.getElementById('editRole').value = user.role;

    document.getElementById('backdrop').classList.add('active');
    document.getElementById('popup').classList.add('active');
    document.getElementById('content1').classList.remove('active');
    document.getElementById('content2').classList.add('active');
}

async function updateUser() {
    const username = document.getElementById('editUsername').value.trim();
    const password = document.getElementById('editPassword').value.trim();
    const role = document.getElementById('editRole').value;

    if (!username) {
        alert('Username is required');
        return;
    }

    const updateData = { username, role };
    if (password) updateData.password = password;

    try {
        await UserAPI.update(currentEditingUserId, updateData);
        closePopup();
        loadUsers();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await UserAPI.delete(id);
        loadUsers();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
