// Global variables
let staffData = [];
let currentEditingStaffId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  loadStaff();
  setupEventListeners();
});

// Load all staff from API
async function loadStaff() {
  try {
    staffData = await StaffAPI.getAll();
    renderStaffTable();
  } catch (error) {
    console.error('Failed to load staff:', error);
    // Don't show alert on every load - only log the error
  }
}

// Render staff in table
function renderStaffTable(dataToRender = staffData) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  // If no staff, show empty state
  if (!dataToRender || dataToRender.length === 0) {
    const headerRow = tbody.querySelector('tr.icon');
    tbody.innerHTML = '';
    if (headerRow) tbody.appendChild(headerRow);
    return;
  }

  const headerRow = tbody.querySelector('tr.icon');
  tbody.innerHTML = '';
  if (headerRow) tbody.appendChild(headerRow);

  // Add staff rows
  dataToRender.forEach(member => {
      const row = document.createElement('tr');
      const statusClass = member.status === 'active' ? 'stock' : 'low';
      
      row.innerHTML = `
        <td><img src="${member.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}" alt="${member.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random'"></td>
        <td>${member.name}</td>
        <td>${member.email || 'N/A'}</td>
        <td>${member.phone || 'N/A'}</td>
        <td>${member.position}</td>
        <td><div class="status"><i class="fa-solid fa-circle-check"></i> ${member.status}</div></td>
        <td>
          <div class="action-container">
            <!-- Desktop Action Buttons -->
            <div class="action action-buttons-desktop">
              <div class="edit" onclick="editStaff('${member.id}')" title="edit staff">
                <i class="fa-solid fa-pen-to-square"></i>
              </div>
              <div class="trash" onclick="deleteStaffById('${member.id}')" title="delete staff">
                <i class="fa-solid fa-trash"></i>
              </div>
            </div>

            <!-- Mobile Action Trigger (Ellipsis) -->
            <div class="mobile-action-trigger" onclick="toggleMobileMenu(event, '${member.id}')">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </div>

            <!-- Mobile Action Menu -->
            <div id="mobileMenu-${member.id}" class="mobile-action-menu">
              <button class="mobile-action-item" onclick="editStaff('${member.id}')">
                <i class="fa-solid fa-pen-to-square" style="color: #1354e2;"></i> Edit
              </button>
              <button class="mobile-action-item delete" onclick="deleteStaffById('${member.id}')">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
}

// Setup event listeners for sidebar and popups
function setupEventListeners() {
  setupSearch();

  // Filter toggle
  const filterBtn = document.getElementById('filterBtn');
  const filterMenu = document.getElementById('filterMenu');
  if (filterBtn && filterMenu) {
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterMenu.classList.toggle('active');
    });
    
    document.addEventListener('click', () => {
      filterMenu.classList.remove('active');
    });
  }

  // Click outside close mobile menus
  document.addEventListener('click', () => {
    document.querySelectorAll('.mobile-action-menu.active').forEach(menu => {
      menu.classList.remove('active');
    });
  });

  // Enter key submission for Add Staff
  const addInputs = ['#addName', '#addEmail', '#addPhone', '#addPosition', '#addDepartment', '#addStatus'];
  addInputs.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveStaff();
        }
      });
    }
  });

  // Enter key submission for Edit Staff
  const editInputs = ['#editName', '#editEmail', '#editPhone', '#editPosition', '#editDepartment', '#editStatus'];
  editInputs.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          updateStaff();
        }
      });
    }
  });
}

function toggleMobileMenu(event, id) {
  event.stopPropagation();
  // Close all other menus
  document.querySelectorAll('.mobile-action-menu').forEach(m => {
    if (m.id !== `mobileMenu-${id}`) m.classList.remove('active');
  });
  
  const menu = document.getElementById(`mobileMenu-${id}`);
  if (menu) {
    menu.classList.toggle('active');
  }
}

// Toggle popup for add staff
function togglePopup() {
  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  currentEditingStaffId = null;
  popup.classList.toggle('active');
  backdrop.classList.toggle('active');
  
  if (popup.classList.contains('active')) {
    content1.classList.add('active');
    content1.style.display = 'block';
    content2.classList.remove('active');
    content2.style.display = 'none';
    document.querySelector('#addName').value = '';
    document.querySelector('#addEmail').value = '';
    const addImageInput = document.querySelector('#addImage');
    if (addImageInput) addImageInput.value = '';
    document.querySelector('#addPhone').value = '';
    document.querySelector('#addPosition').value = '';
    document.querySelector('#addDepartment').value = '';
    document.querySelector('#addStatus').value = 'active';
  } else {
    content1.classList.remove('active');
    content2.classList.remove('active');
    content1.style.display = 'none';
    content2.style.display = 'none';
  }
}

// Edit staff
function editStaff(staffId) {
  staffId = parseInt(staffId); // Convert string ID to integer
  const member = staffData.find(s => s.id === staffId);
  if (!member) {
    alert('❌ Staff member not found');
    return;
  }

  currentEditingStaffId = staffId;

  document.querySelector('#editName').value = member.name;
  const editImageInput = document.querySelector('#editImage');
  if (editImageInput) editImageInput.value = '';
  document.querySelector('#editEmail').value = member.email || '';
  document.querySelector('#editPhone').value = member.phone || '';
  document.querySelector('#editPosition').value = member.position;
  document.querySelector('#editDepartment').value = member.department || '';
  document.querySelector('#editStatus').value = member.status;

  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  popup.classList.add('active');
  backdrop.classList.add('active');
  
  // Explicitly manage classes to prevent "all forms popping up"
  content1.classList.remove('active');
  content1.style.display = 'none';
  content2.classList.add('active');
  content2.style.display = 'block';
}

// Save new staff
async function saveStaff() {
  const name = document.querySelector('#addName')?.value;
  const email = document.querySelector('#addEmail')?.value;
  const phone = document.querySelector('#addPhone')?.value;
  const position = document.querySelector('#addPosition')?.value;
  const department = document.querySelector('#addDepartment')?.value || '';
  const status = document.querySelector('#addStatus')?.value || 'active';

  const imageInput = document.querySelector('#addImage');
  let imageUrl = '';
  if (imageInput && imageInput.files && imageInput.files[0]) {
    imageUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageInput.files[0]);
    });
  }

  if (!name || !email || !position) {
    alert('⚠️ Name, email, and position are required');
    return;
  }

  try {
    await StaffAPI.create({
      name,
      email,
      phone,
      position,
      department,
      status,
      image_url: imageUrl
    });

    alert('✅ Staff member added successfully!');
    closePopup();
    loadStaff();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Update existing staff
async function updateStaff() {
  if (!currentEditingStaffId) {
    alert('❌ No staff member selected for editing');
    return;
  }

  const name = document.querySelector('#editName')?.value;
  const email = document.querySelector('#editEmail')?.value;
  const phone = document.querySelector('#editPhone')?.value;
  const position = document.querySelector('#editPosition')?.value;
  const department = document.querySelector('#editDepartment')?.value || '';
  const status = document.querySelector('#editStatus')?.value;

  const imageInput = document.querySelector('#editImage');
  let imageUrl = undefined;
  if (imageInput && imageInput.files && imageInput.files[0]) {
    imageUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageInput.files[0]);
    });
  } else {
    const member = staffData.find(m => m.id === currentEditingStaffId);
    if (member) {
      imageUrl = member.image_url || '';
    }
  }

  if (!name || !email || !position) {
    alert('⚠️ Name, email, and position are required');
    return;
  }

  try {
    await StaffAPI.update(currentEditingStaffId, {
      name,
      email,
      phone,
      position,
      department,
      status,
      image_url: imageUrl
    });

    alert('🔄 Staff member updated successfully!');
    closePopup();
    loadStaff();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Delete staff
async function deleteStaffById(staffId) {
  staffId = parseInt(staffId);
  if (!confirm('⚠️ Are you sure you want to delete this staff member?')) {
    return;
  }

  try {
    await StaffAPI.delete(staffId);
    alert('🗑️ Staff member deleted successfully!');
    loadStaff();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Close popup
function closePopup() {
  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  if (popup) popup.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  if (content1) {
    content1.classList.remove('active');
    content1.style.display = 'none';
  }
  if (content2) {
    content2.classList.remove('active');
    content2.style.display = 'none';
  }
  currentEditingStaffId = null;
}

// Close popup on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  const backdrop = document.getElementById('backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closePopup);
  }

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closePopup();
    }
  });
});

// Setup search functionality
function setupSearch() {
  const searchInput = document.querySelector('.searchbar input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredData = staffData.filter(member => 
        (member.name && member.name.toLowerCase().includes(searchTerm)) || 
        (member.email && member.email.toLowerCase().includes(searchTerm)) ||
        (member.position && member.position.toLowerCase().includes(searchTerm)) ||
        (member.phone && member.phone.toLowerCase().includes(searchTerm))
      );
      renderStaffTable(filteredData);
    });
  }
}

// Sort data A-Z or Z-A
function sortData(order) {
  if (order === 'asc') {
    staffData.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    staffData.sort((a, b) => b.name.localeCompare(a.name));
  }
  renderStaffTable();
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) filterMenu.classList.remove('active');
}
