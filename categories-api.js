// Global variables
let categoriesData = [];
let currentEditingCategoryId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
  setupEventListeners();
});

// Load all categories from API
async function loadCategories() {
  try {
    categoriesData = await CategoryAPI.getAll();
    renderCategoriesTable();
  } catch (error) {
    console.error('Failed to load categories:', error);
    // Don't show alert on every load - only log the error
  }
}

// Render categories in table
function renderCategoriesTable(dataToRender = categoriesData) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  // If no categories, show empty state
  if (!dataToRender || dataToRender.length === 0) {
    const headerRow = tbody.querySelector('tr.icon');
    tbody.innerHTML = '';
    if (headerRow) tbody.appendChild(headerRow);
    return;
  }

  const headerRow = tbody.querySelector('tr.icon');
  tbody.innerHTML = '';
  if (headerRow) tbody.appendChild(headerRow);

  // Add category rows
  dataToRender.forEach((category, index) => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${category.name}</td>
        <td>${category.description || 'N/A'}</td>
        <td>${new Date(category.created_at).toLocaleString() || 'N/A'}</td>
        <td>
          <div class="action">
            <div class="edit" onclick="editCategory('${category.id}')" title="edit category">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            <div class="trash" onclick="deleteCategoryById('${category.id}')" title="delete category">
              <i class="fa-solid fa-trash"></i>
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
}

// Toggle popup for add category
function togglePopup() {
  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  currentEditingCategoryId = null;
  popup.classList.toggle('active');
  backdrop.classList.toggle('active');
  
  if (popup.classList.contains('active')) {
    content1.classList.add('active');
    content1.style.display = 'block';
    content2.classList.remove('active');
    content2.style.display = 'none';
    document.querySelector('#addName').value = '';
    document.querySelector('#addDescription').value = '';
  }
}

// Edit category
function editCategory(categoryId) {
  const category = categoriesData.find(c => c.id === categoryId);
  if (!category) {
    alert('❌ Category not found');
    return;
  }

  currentEditingCategoryId = categoryId;

  document.querySelector('#editName').value = category.name;
  document.querySelector('#editDescription').value = category.description || '';

  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  popup.classList.add('active');
  backdrop.classList.add('active');
  content1.style.display = 'none';
  content2.style.display = 'block';
}

// Save new category
async function saveCategory() {
  const name = document.querySelector('#addName')?.value;
  const description = document.querySelector('#addDescription')?.value;

  if (!name) {
    alert('⚠️ Category name is required');
    return;
  }

  try {
    await CategoryAPI.create({
      name,
      description
    });

    alert('✅ Category added successfully!');
    closePopup();
    loadCategories();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Update existing category
async function updateCategory() {
  if (!currentEditingCategoryId) {
    alert('❌ No category selected for editing');
    return;
  }

  const name = document.querySelector('#editName')?.value;
  const description = document.querySelector('#editDescription')?.value;

  if (!name) {
    alert('⚠️ Category name is required');
    return;
  }

  try {
    await CategoryAPI.update(currentEditingCategoryId, {
      name,
      description
    });

    alert('🔄 Category updated successfully!');
    closePopup();
    loadCategories();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Delete category
async function deleteCategoryById(categoryId) {
  if (!confirm('⚠️ Are you sure you want to delete this category?')) {
    return;
  }

  try {
    await CategoryAPI.delete(categoryId);
    alert('🗑️ Category deleted successfully!');
    loadCategories();
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
  currentEditingCategoryId = null;
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
      const filteredData = categoriesData.filter(category => 
        category.name.toLowerCase().includes(searchTerm) || 
        (category.description && category.description.toLowerCase().includes(searchTerm))
      );
      renderCategoriesTable(filteredData);
    });
  }
}

// Sort data A-Z or Z-A
function sortData(order) {
  if (order === 'asc') {
    categoriesData.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    categoriesData.sort((a, b) => b.name.localeCompare(a.name));
  }
  renderCategoriesTable();
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) filterMenu.classList.remove('active');
}
