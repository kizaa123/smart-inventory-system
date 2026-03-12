// State variables
let productsData = [];
let categoriesData = [];
let staffData = [];
let cart = [];
let currentFilter = 'all';
let searchQuery = '';
const TAX_RATE = 0; // Set to 0 for now, could be e.g. 0.08 for 8%

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadData();
});

function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('posSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderProducts();
    });
  }
}

async function loadData() {
  try {
    // Load products, categories, and staff concurrently
    const [products, categories, staff] = await Promise.all([
      ProductAPI.getAll(),
      CategoryAPI.getAll(),
      StaffAPI.getAll()
    ]);
    
    productsData = products || [];
    categoriesData = categories || [];
    staffData = staff || [];

    renderCategories();
    renderProducts();
    populateStaffSelect();
  } catch (error) {
    console.error('Error loading POS data:', error);
    alert('Failed to load store data. Please ensure backend is running.');
  }
}

function renderCategories() {
  const container = document.getElementById('posCategories');
  if (!container) return;

  // Keep 'All' button and clear the rest
  container.innerHTML = `<button class="ctg-pill active" onclick="filterByCategory('all')">All</button>`;
  
  categoriesData.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'ctg-pill';
    btn.textContent = cat.name;
    btn.onclick = () => filterByCategory(cat.id, btn);
    container.appendChild(btn);
  });
}

function filterByCategory(categoryId, btnElement = null) {
  currentFilter = categoryId;
  
  // Update UI active state
  const container = document.getElementById('posCategories');
  const buttons = container.querySelectorAll('.ctg-pill');
  buttons.forEach(b => b.classList.remove('active'));
  
  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    // If 'all', highlight the first button
    buttons[0].classList.add('active');
  }

  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  // Filter products based on search and selected category
  const filteredProducts = productsData.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.sku.toLowerCase().includes(searchQuery);
    const matchesCategory = currentFilter === 'all' || p.category_id === parseInt(currentFilter);
    return matchesSearch && matchesCategory;
  });

  if (filteredProducts.length === 0) {
    grid.innerHTML = `<div style="padding:20px; color:#777;">No products found.</div>`;
    return;
  }

  filteredProducts.forEach(product => {
    const stockClass = product.stock_quantity <= (product.low_stock_threshold || 10) ? 'low' : 'good';
    const imageUrl = product.image_url || '../images/placeholder.jpg';
    
    const card = document.createElement('div');
    card.className = 'pos-card';
    card.onclick = () => addToCart(product);
    
    card.innerHTML = `
      <img src="${imageUrl}" alt="${product.name}" class="p-img" onerror="this.src='https://via.placeholder.com/150?text=${product.sku}'">
      <div class="p-name" title="${product.name}">${product.name}</div>
      <div class="p-price">GH<i class="fa-solid fa-cedi-sign"></i>${parseFloat(product.sell_price || 0).toFixed(2)}</div>
      <div class="p-stock ${stockClass}">${product.stock_quantity} in stock</div>
    `;
    grid.appendChild(card);
  });
}

// ==================== CART LOGIC ====================

function addToCart(product) {
  if (product.stock_quantity <= 0) {
    alert('This item is out of stock!');
    return;
  }

  const existingItem = cart.find(item => item.product_id === product.id);
  if (existingItem) {
    if (existingItem.quantity >= product.stock_quantity) {
       alert('Cannot add more than available stock.');
       return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      price: parseFloat(product.sell_price || 0),
      quantity: 1,
      image_url: product.image_url,
      stock: product.stock_quantity
    });
  }
  
  updateCartUI();
}

function updateQuantity(productId, change) {
  const itemIndex = cart.findIndex(item => item.product_id === productId);
  if (itemIndex > -1) {
    const item = cart[itemIndex];
    const newQty = item.quantity + change;
    
    if (newQty <= 0) {
      removeFromCart(productId);
    } else if (newQty > item.stock) {
      alert('Cannot exceed available stock.');
    } else {
      item.quantity = newQty;
      updateCartUI();
    }
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.product_id !== productId);
  updateCartUI();
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm('Are you sure you want to clear the current order?')) {
    cart = [];
    updateCartUI();
  }
}

function updateCartUI() {
  const container = document.getElementById('cartItemsContainer');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-message">
        <i class="fa-solid fa-basket-shopping"></i>
        <p>Your cart is empty.</p>
      </div>`;
    updateTotals();
    return;
  }

  container.innerHTML = '';
  cart.forEach(item => {
    const imageUrl = item.image_url || 'https://via.placeholder.com/50?text=Item';
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${imageUrl}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50?text=Item'">
      <div class="c-details">
        <div class="c-name">${item.name}</div>
        <div class="c-price">GH<i class="fa-solid fa-cedi-sign"></i>${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</div>
      </div>
      <div class="c-controls">
        <button class="c-remove" onclick="removeFromCart(${item.product_id})" title="Remove">
          <i class="fa-solid fa-times"></i>
        </button>
        <div class="c-qty">
          <button onclick="updateQuantity(${item.product_id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.product_id}, 1)">+</button>
        </div>
      </div>
    `;
    container.appendChild(row);
  });

  updateTotals();
}

function updateTotals() {
  let subtotal = 0;
  cart.forEach(item => {
    const price = parseFloat(item.price) || 0;
    const qty = parseInt(item.quantity) || 0;
    subtotal += price * qty;
  });

  const tax = subtotal * (typeof TAX_RATE === 'number' ? TAX_RATE : 0);
  const total = subtotal + tax;

  const subtotalEl = document.getElementById('cartSubtotal');
  const taxEl = document.getElementById('cartTax');
  const totalEl = document.getElementById('cartTotal');

  if (subtotalEl) subtotalEl.innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${subtotal.toFixed(2)}`;
  if (taxEl) taxEl.innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${tax.toFixed(2)}`;
  if (totalEl) totalEl.innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${total.toFixed(2)}`;
  
  console.log('Totals updated:', { subtotal, tax, total });
}

// ==================== CHECKOUT LOGIC ====================

function populateStaffSelect() {
  const select = document.getElementById('staffSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Select Staff Member</option>';
  
  staffData.forEach(staff => {
    const option = document.createElement('option');
    option.value = staff.id;
    option.textContent = staff.name;
    select.appendChild(option);
  });
}

function openCheckoutPopup() {
  if (cart.length === 0) {
    alert('Cart is empty! Add products first.');
    return;
  }
  
  const total = document.getElementById('cartTotal').innerHTML;
  document.getElementById('checkoutTotalDisplay').innerHTML = total;
  
  document.getElementById('popup').classList.add('active');
  document.getElementById('backdrop').classList.add('active');
  document.getElementById('content1').style.display = 'block';
}

function closePopup() {
  const popup = document.getElementById('popup');
  const backdrop = document.getElementById('backdrop');
  if (popup && backdrop) {
    popup.classList.remove('active');
    backdrop.classList.remove('active');
  }
}

async function completeSale() {
  const staffId = document.getElementById('staffSelect').value;
  if (!staffId) {
    alert('Please select the staff member who served this order.');
    return;
  }

  // Disable button to prevent double-click
  const btn = document.querySelector('.confirm-checkout-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;

  try {
    const payload = {
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      })),
      staff_id: parseInt(staffId)
    };

    const response = await SalesAPI.create(payload);
    alert(`✅ ${response.message}\nOrder Number: ${response.order_id}`);
    
    // Clear cart and close
    cart = [];
    updateCartUI();
    closePopup();
    
    // Reload products so inventory quantities are updated
    const products = await ProductAPI.getAll();
    productsData = products || [];
    renderProducts();

  } catch (error) {
    console.error('Checkout error:', error);
    alert(`❌ Checkout failed: ${error.message}`);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
