// Global variables
let productsData = [];
let categoriesData = [];
let suppliersData = [];
let currentEditingProductId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  loadProducts();
  loadCategories();
  loadSuppliers();
  setupEventListeners();
});

// Load all products from API
async function loadProducts() {
  try {
    productsData = await ProductAPI.getAll();
    renderProductTable();
  } catch (error) {
    console.error('Failed to load products:', error);
    alert('❌ Failed to load products. Make sure the backend is running.');
  }
}

// Load all categories for dropdown
async function loadCategories() {
  try {
    categoriesData = await CategoryAPI.getAll();
    populateCategorySelect();
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Load all suppliers for dropdown
async function loadSuppliers() {
  try {
    suppliersData = await SupplierAPI.getAll();
    populateSupplierSelect();
  } catch (error) {
    console.error('Failed to load suppliers:', error);
  }
}

// Populate category dropdown in forms
function populateCategorySelect() {
  const selects = document.querySelectorAll('#addCategory, #editCategory');
  selects.forEach(select => {
    select.innerHTML = '';
    categoriesData.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  });
}

// Populate supplier dropdown in forms
function populateSupplierSelect() {
  const selects = document.querySelectorAll('#addSupplier, #editSupplier');
  selects.forEach(select => {
    select.innerHTML = '';
    suppliersData.forEach(sup => {
      const option = document.createElement('option');
      option.value = sup.id;
      option.textContent = sup.name;
      select.appendChild(option);
    });
  });
}

// Render products in table
function renderProductTable(dataToRender = productsData) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  // If no products, show empty state
  if (!dataToRender || dataToRender.length === 0) {
    // Keep only header
    const headerRow = tbody.querySelector('tr.icon');
    tbody.innerHTML = '';
    if (headerRow) tbody.appendChild(headerRow);
    return;
  }

  // Clear and rebuild
  const headerRow = tbody.querySelector('tr.icon');
  tbody.innerHTML = '';
  if (headerRow) tbody.appendChild(headerRow);

  // Add product rows
  dataToRender.forEach(product => {
      const row = document.createElement('tr');
      const stockClass = product.stock_quantity < (product.low_stock_threshold || 10) ? 'low' : 'stock';
      
      row.innerHTML = `
        <td><img src="${product.image_url || '../images/placeholder.jpg'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/100?text=${product.sku}'"></td>
        <td>${product.sku}</td>
        <td>${product.name}</td>
        <td>${product.category_name || 'N/A'}</td>
        <td>GH<i class="fa-solid fa-cedi-sign"></i>${product.sell_price.toFixed(2)}</td>
        <td><div class="${stockClass}">${product.stock_quantity}</div></td>
        <td>
          <div class="action">
            <div class="edit" onclick="editProduct('${product.id}')" title="edit product">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            <div class="trash" onclick="deleteProductById('${product.id}')" title="delete product">
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

  // Sidebar toggle
}

// Toggle popup for add product
function togglePopup() {
  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  currentEditingProductId = null;
  popup.classList.toggle('active');
  backdrop.classList.toggle('active');
  
  if (popup.classList.contains('active')) {
    content1.style.display = 'block';
    content2.style.display = 'none';
    // Clear form inputs
    document.querySelector('#barcode').value = '';
    document.querySelector('#addName').value = '';
    const addImageInput = document.querySelector('#addImage');
    if (addImageInput) addImageInput.value = '';
    document.querySelector('#addCategory').value = '';
    document.querySelector('#addSupplier').value = '';
    document.querySelector('#addCost').value = '';
    document.querySelector('#addSell').value = '';
    document.querySelector('#addStock').value = '';
  }
}

// Edit product
function editProduct(productId) {
  const product = productsData.find(p => p.id === productId);
  if (!product) {
    alert('❌ Product not found');
    return;
  }

  currentEditingProductId = productId;

  // Populate edit form
  document.querySelector('#editName').value = product.name;
  const editImageInput = document.querySelector('#editImage');
  if (editImageInput) editImageInput.value = '';
  document.querySelector('#editCategory').value = product.category_id;
  document.querySelector('#editSupplier').value = product.supplier_id;
  document.querySelector('#editCost').value = product.cost_price;
  document.querySelector('#editSell').value = product.sell_price;
  document.querySelector('#editStock').value = product.stock_quantity;

  // Show edit popup
  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  const content1 = document.getElementById('content1');
  const content2 = document.getElementById('content2');
  
  popup.classList.add('active');
  backdrop.classList.add('active');
  content1.style.display = 'none';
  content2.style.display = 'block';
}

// Save new product
async function saveProduct() {
  const barcode = document.querySelector('#barcode')?.value;
  const name = document.querySelector('#addName')?.value;
  const categoryId = document.querySelector('#addCategory')?.value;
  const supplierId = document.querySelector('#addSupplier')?.value;
  const costPrice = parseFloat(document.querySelector('#addCost')?.value);
  const sellPrice = parseFloat(document.querySelector('#addSell')?.value);
  const stock = parseInt(document.querySelector('#addStock')?.value);

  const imageInput = document.querySelector('#addImage');
  let imageUrl = '';
  if (imageInput && imageInput.files && imageInput.files[0]) {
    imageUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageInput.files[0]);
    });
  }

  if (!barcode || !name || !categoryId || !supplierId) {
    alert('⚠️ Please fill in all required fields');
    return;
  }

  try {
    await ProductAPI.create({
      sku: barcode,
      name,
      image_url: imageUrl,
      category_id: parseInt(categoryId),
      supplier_id: parseInt(supplierId),
      cost_price: costPrice,
      sell_price: sellPrice,
      stock_quantity: stock
    });

    alert('✅ Product added successfully!');
    closePopup();
    loadProducts();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Update existing product
async function updateProduct() {
  if (!currentEditingProductId) {
    alert('❌ No product selected for editing');
    return;
  }

  const name = document.querySelector('#editName')?.value;
  const categoryId = document.querySelector('#editCategory')?.value;
  const supplierId = document.querySelector('#editSupplier')?.value;
  const costPrice = parseFloat(document.querySelector('#editCost')?.value);
  const sellPrice = parseFloat(document.querySelector('#editSell')?.value);
  const stock = parseInt(document.querySelector('#editStock')?.value);

  const imageInput = document.querySelector('#editImage');
  let imageUrl = undefined;
  if (imageInput && imageInput.files && imageInput.files[0]) {
    imageUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageInput.files[0]);
    });
  } else {
    const product = productsData.find(p => p.id === currentEditingProductId);
    if (product) {
      imageUrl = product.image_url || '';
    }
  }

  if (!name || !categoryId || !supplierId) {
    alert('⚠️ Please fill in all required fields');
    return;
  }

  try {
    await ProductAPI.update(currentEditingProductId, {
      name,
      image_url: imageUrl,
      category_id: parseInt(categoryId),
      supplier_id: parseInt(supplierId),
      cost_price: costPrice,
      sell_price: sellPrice,
      stock_quantity: stock
    });

    alert('🔄 Product updated successfully!');
    closePopup();
    loadProducts();
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Delete product
async function deleteProductById(productId) {
  if (!confirm('⚠️ Are you sure you want to delete this product?')) {
    return;
  }

  try {
    await ProductAPI.delete(productId);
    alert('🗑️ Product deleted successfully!');
    loadProducts();
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
  currentEditingProductId = null;
}

// Close popup on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  const backdrop = document.getElementById('backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closePopup);
  }

  // Close on Escape key
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
      const filteredData = productsData.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.sku.toLowerCase().includes(searchTerm) ||
        (product.category_name && product.category_name.toLowerCase().includes(searchTerm))
      );
      renderProductTable(filteredData);
    });
  }
}
// Generate a random barcode starting with #
function generateRandomBarcode(button) {
  const barcodeInput = document.getElementById('barcode');
  if (!barcodeInput) return;

  // Add rotation animation class to the icon
  const icon = button.querySelector('i');
  if (icon) {
    icon.classList.add('rotating');
    
    // Clear input while spinning for a "reveal" effect
    barcodeInput.value = '';
    barcodeInput.placeholder = 'Generating...';
    
    // Wait for spin animation (1000ms) before generating
    setTimeout(() => {
      // Generate random 4-digit number after #PR-
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const prefix = "PR-";
      barcodeInput.value = `#${prefix}${randomNum}`;
      barcodeInput.placeholder = '#WA-0000';
      
      icon.classList.remove('rotating');
      console.log('Generated Barcode:', barcodeInput.value);
    }, 1000);
  }
}

// Sort data A-Z or Z-A
function sortData(order) {
  if (order === 'asc') {
    productsData.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    productsData.sort((a, b) => b.name.localeCompare(a.name));
  }
  renderProductTable();
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) filterMenu.classList.remove('active');
}
