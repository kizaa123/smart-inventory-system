// Global variables
let suppliersData = [];
let currentEditingSupplierId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  loadSuppliers();
  setupEventListeners();
});

// Load all suppliers from API
async function loadSuppliers() {
  try {
    suppliersData = await SupplierAPI.getAll();
    renderSuppliersTable();
  } catch (error) {
    console.error('Failed to load suppliers:', error);
    // Don't show alert on every load - only log the error
    // This prevents continuous alerts when API is slow
  }
}

// Render suppliers in table
function renderSuppliersTable(dataToRender = suppliersData) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  // If no suppliers, show empty state
  if (!dataToRender || dataToRender.length === 0) {
    const headerRow = tbody.querySelector('tr.icon');
    tbody.innerHTML = '';
    if (headerRow) tbody.appendChild(headerRow);
    return;
  }

  const headerRow = tbody.querySelector('tr.icon');
  tbody.innerHTML = '';
  if (headerRow) tbody.appendChild(headerRow);

  // Add supplier rows
  dataToRender.forEach(supplier => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${supplier.name}</td>
        <td>${supplier.contact_person || 'N/A'}</td>
        <td>${supplier.email || 'N/A'}</td>
        <td>${supplier.phone || 'N/A'}</td>
        <td>${supplier.address || 'N/A'}</td>
        <td>
          <div class="action-container">
            <!-- Desktop Action Buttons -->
            <div class="action action-buttons-desktop">
              <div class="edit" onclick="editSupplier('${supplier.id}')" title="edit supplier">
                <i class="fa-solid fa-pen-to-square"></i>
              </div>
              <div class="trash" onclick="deleteSupplierById('${supplier.id}')" title="delete supplier">
                <i class="fa-solid fa-trash"></i>
              </div>
            </div>

            <!-- Mobile Action Trigger (Ellipsis) -->
            <div class="mobile-action-trigger" onclick="toggleMobileMenu(event, '${supplier.id}')">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </div>

            <!-- Mobile Action Menu -->
            <div id="mobileMenu-${supplier.id}" class="mobile-action-menu">
              <button class="mobile-action-item" onclick="editSupplier('${supplier.id}')">
                <i class="fa-solid fa-pen-to-square" style="color: #1354e2;"></i> Edit
              </button>
              <button class="mobile-action-item delete" onclick="deleteSupplierById('${supplier.id}')">
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

// Toggle popup for add supplier
function togglePopup() {
  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  currentEditingSupplierId = null;
  popup.classList.toggle('active');
  backdrop.classList.toggle('active');
  
  if (popup.classList.contains('active')) {
    content1.classList.add('active');
    content1.style.display = 'block';
    content2.classList.remove('active');
    content2.style.display = 'none';
    document.querySelector('#addName').value = '';
    document.querySelector('#addContact').value = '';
    document.querySelector('#addEmail').value = '';
    document.querySelector('#addPhone').value = '';
    document.querySelector('#addAddress').value = '';
  }
}

// Edit supplier
function editSupplier(supplierId) {
  const supplier = suppliersData.find(s => String(s.id) === String(supplierId));
  if (!supplier) {
    alert('❌ Supplier not found');
    return;
  }

  currentEditingSupplierId = parseInt(supplierId);

  document.querySelector('#editName').value = supplier.name;
  document.querySelector('#editContact').value = supplier.contact_person || '';
  document.querySelector('#editEmail').value = supplier.email || '';
  document.querySelector('#editPhone').value = supplier.phone || '';
  document.querySelector('#editAddress').value = supplier.address || '';

  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  popup.classList.add('active');
  backdrop.classList.add('active');
  content1.style.display = 'none';
  content2.style.display = 'block';
}

// Save new supplier
async function saveSupplier() {
  const name = document.querySelector('#addName')?.value;
  const contact = document.querySelector('#addContact')?.value;
  const email = document.querySelector('#addEmail')?.value;
  const phone = document.querySelector('#addPhone')?.value;
  const address = document.querySelector('#addAddress')?.value;

  if (!name) {
    alert('⚠️ Supplier name is required');
    return;
  }

  try {
    await SupplierAPI.create({
      name,
      contact_person: contact,
      email,
      phone,
      address
    });

    alert('✅ Supplier added successfully!');
    closePopup();
    loadSuppliers();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Update existing supplier
async function updateSupplier() {
  if (!currentEditingSupplierId) {
    alert('❌ No supplier selected for editing');
    return;
  }

  const name = document.querySelector('#editName')?.value;
  const contact = document.querySelector('#editContact')?.value;
  const email = document.querySelector('#editEmail')?.value;
  const phone = document.querySelector('#editPhone')?.value;
  const address = document.querySelector('#editAddress')?.value;

  if (!name) {
    alert('⚠️ Supplier name is required');
    return;
  }

  try {
    await SupplierAPI.update(currentEditingSupplierId, {
      name,
      contact_person: contact,
      email,
      phone,
      address
    });

    alert('🔄 Supplier updated successfully!');
    closePopup();
    loadSuppliers();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Delete supplier
async function deleteSupplierById(supplierId) {
  supplierId = parseInt(supplierId);
  if (!confirm('⚠️ Are you sure you want to delete this supplier?')) {
    return;
  }

  try {
    await SupplierAPI.delete(supplierId);
    alert('🗑️ Supplier deleted successfully!');
    loadSuppliers();
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
  
  popup.classList.remove('active');
  backdrop.classList.remove('active');
  content1.style.display = 'none';
  content2.style.display = 'none';
  currentEditingSupplierId = null;
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
      const filteredData = suppliersData.filter(supplier => 
        (supplier.name && supplier.name.toLowerCase().includes(searchTerm)) || 
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm)) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm)) ||
        (supplier.phone && supplier.phone.toLowerCase().includes(searchTerm))
      );
      renderSuppliersTable(filteredData);
    });
  }
}

// Sort data A-Z or Z-A
function sortData(order) {
  if (order === 'asc') {
    suppliersData.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    suppliersData.sort((a, b) => b.name.localeCompare(a.name));
  }
  renderSuppliersTable();
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) filterMenu.classList.remove('active');
}
