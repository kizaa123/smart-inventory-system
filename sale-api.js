// State variables
let productsData = [];
let categoriesData = [];
let staffData = [];
let cart = [];
let currentFilter = 'all';
let searchQuery = '';
let lastSaleData = null; // Store data for the last successful sale for printing
const TAX_RATE = 0; // Set to 0 for now, could be e.g. 0.08 for 8%

// ==================== CAMERA BARCODE / QR SCANNER ====================

let camScanner = null;       // Html5Qrcode instance
let lastDetectedCode = null; // debounce

function openCamScanner() {
  const overlay = document.getElementById('barcode-scanner-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  setCamStatus('', '<i class="fa-solid fa-rotate fa-spin"></i> Starting camera…');

  camScanner = new Html5Qrcode('qr-reader-cam');

  Html5Qrcode.getCameras().then(cameras => {
    if (!cameras || cameras.length === 0) {
      setCamStatus('err', '<i class="fa-solid fa-triangle-exclamation"></i> No camera found on this device.');
      return;
    }

    // Prefer rear camera (environment), fall back to first available
    const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];

    camScanner.start(
      cam.id,
      { fps: 12, qrbox: { width: 280, height: 280 } },
      (decodedText) => onBarcodeDetected(decodedText),
      () => { /* frame errors are normal – ignore */ }
    ).then(() => {
      setCamStatus('', '<i class="fa-solid fa-camera"></i> Point camera at the product barcode');
    }).catch(err => {
      setCamStatus('err', '<i class="fa-solid fa-triangle-exclamation"></i> Could not start camera. Please allow camera access.');
      console.error('Camera start error:', err);
    });

  }).catch(err => {
    setCamStatus('err', '<i class="fa-solid fa-triangle-exclamation"></i> Camera access denied or unavailable.');
    console.error('getCameras error:', err);
  });
}

async function onBarcodeDetected(code) {
  // Debounce: same code is ignored for 3 seconds to avoid double-trigger
  if (code === lastDetectedCode) return;
  lastDetectedCode = code;
  setTimeout(() => { lastDetectedCode = null; }, 3000);

  // Just fill the text input and close the camera —
  // the cashier reviews and presses Enter to add to cart
  closeCamScanner();

  const input = document.getElementById('barcodeInput');
  if (input) {
    input.value = code.trim();
    input.focus();
    // Highlight so the cashier clearly sees what was scanned
    input.select();
  }
}


function closeCamScanner() {
  const overlay = document.getElementById('barcode-scanner-overlay');
  if (overlay) overlay.classList.remove('open');
  lastDetectedCode = null;

  if (camScanner) {
    camScanner.stop().catch(() => {}).finally(() => {
      camScanner.clear();
      camScanner = null;
    });
  }
}

function setCamStatus(type, html) {
  const el = document.getElementById('cam-status-msg');
  if (!el) return;
  el.className = type ? type : '';
  el.innerHTML = html;
}

// ==================== END CAMERA SCANNER ====================

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadData();
});


function setupEventListeners() {
  // Product name / SKU search
  const searchInput = document.getElementById('posSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderProducts();
    });
  }

  // Barcode text input – press Enter to look up and add product
  const barcodeInput = document.getElementById('barcodeInput');
  if (barcodeInput) {
    barcodeInput.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const code = barcodeInput.value.trim();
      if (!code) return;
      showBcBadge('', '');
      try {
        const product = await ProductAPI.getBySku(code);
        if (!product || !product.id) { showBcBadge('err', '❌ Not found'); return; }
        const local = productsData.find(p => p.id === product.id) || product;
        addToCart(local);
        showBcBadge('ok', `✅ ${product.name}`);
        barcodeInput.value = '';
      } catch (err) {
        showBcBadge('err', err.message && err.message.includes('404') ? '❌ Not found' : '❌ Error');
        console.error('Barcode input error:', err);
      }
    });
  }

  // Enter key submission for Checkout form
  const checkoutInputs = ['#staffSelect', '#paymentMethod', '#customerName'];
  checkoutInputs.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          completeSale();
        }
      });
    }
  });
}

function showBcBadge(type, text) {
  const el = document.getElementById('bcBadge');
  if (!el) return;
  el.textContent = text;
  el.className = 'bc-badge' + (type ? ' show ' + type : '');
  if (type) setTimeout(() => { el.className = 'bc-badge'; }, 2500);
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
    grid.innerHTML = `<div style="padding:20px; color:var(--text-muted);">No products found.</div>`;
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
      <div class="p-stock ${stockClass}">${product.stock_quantity} Pkts | ${product.stock_quantity * ((product.pieces_per_packet && parseInt(product.pieces_per_packet) > 1) ? parseInt(product.pieces_per_packet) : 24)} pcs</div>
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
      stock: product.stock_quantity,
      pieces_per_packet: (product.pieces_per_packet && parseInt(product.pieces_per_packet) > 1) ? parseInt(product.pieces_per_packet) : 24
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

function formatFraction(qty) {
  const whole = Math.floor(qty);
  const fraction = qty - whole;
  let fractionStr = '';
  if (Math.abs(fraction - 0.25) < 0.01) fractionStr = '1/4';
  else if (Math.abs(fraction - 0.5) < 0.01) fractionStr = '1/2';
  else if (Math.abs(fraction - 0.75) < 0.01) fractionStr = '3/4';
  else if (fraction > 0) fractionStr = fraction.toFixed(2);
  
  if (whole === 0) {
    return fractionStr || '0';
  } else if (fractionStr) {
    return `${whole} ${fractionStr}`;
  } else {
    return `${whole}`;
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
        <div class="c-qty-wrapper" style="display: flex; flex-direction: column; align-items: flex-end;">
          <div class="c-qty">
            <button onclick="updateQuantity(${item.product_id}, -0.25)">-</button>
            <span style="width: auto; padding: 0 10px;">${formatFraction(item.quantity)} Pkts</span>
            <button onclick="updateQuantity(${item.product_id}, 0.25)">+</button>
          </div>
          <small style="font-size: 11px; color: #888; margin-top: 4px; font-weight: 600;">(${Math.round(item.quantity * ((item.pieces_per_packet && parseInt(item.pieces_per_packet) > 1) ? parseInt(item.pieces_per_packet) : 24))} pieces)</small>
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
    const qty = parseFloat(item.quantity) || 0;
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

async function completeSale() {
  const staffId = document.getElementById('staffSelect').value;
  const customerName = document.getElementById('customerName').value.trim();
  
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
    
    // Show custom success modal instead of alert
    document.getElementById('content1').style.display = 'none';
    const content2 = document.getElementById('content2');
    if (content2) {
      document.getElementById('successMessage').textContent = response.message;
      document.getElementById('successOrderId').textContent = '#' + response.order_id;
      
      // Calculate total for display
      let totalValue = 0;
      cart.forEach(item => totalValue += (item.price * item.quantity));
      document.getElementById('successAmount').textContent = 'GH₵' + totalValue.toFixed(2);
      
      // Store data for printing
      const staffName = document.getElementById('staffSelect').options[document.getElementById('staffSelect').selectedIndex].text;
      lastSaleData = {
          order_id: response.order_id,
          date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
          staff_name: staffName,
          customer_name: customerName,
          items: cart.map(item => ({...item})),
          total: totalValue.toFixed(2)
      };

      content2.style.display = 'block';
    }
    
    // Clear cart
    cart = [];
    updateCartUI();
    
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

function printReceipt() {
    console.log("Printing receipt with data:", lastSaleData);
    if (!lastSaleData) {
        alert("No sale data found to print. Please complete a sale first.");
        return;
    }

    // Populate Receipt
    document.getElementById("print-date").textContent = lastSaleData.date;
    document.getElementById("print-order-id").textContent = "#" + lastSaleData.order_id;
    document.getElementById("print-server").textContent = lastSaleData.staff_name;
    
    if (lastSaleData.customer_name) {
        document.getElementById("print-customer").textContent = lastSaleData.customer_name;
        document.getElementById("print-customer-row").style.display = "flex";
    } else {
        document.getElementById("print-customer-row").style.display = "none";
    }

    const itemsBody = document.getElementById("print-items-body");
    itemsBody.innerHTML = "";
    lastSaleData.items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.name}</td>
            <td style="text-align: center;">
              ${formatFraction(item.quantity)} Pkts<br>
              <span style="font-size: 10px; color: #555;">(${Math.round(item.quantity * ((item.pieces_per_packet && parseInt(item.pieces_per_packet) > 1) ? parseInt(item.pieces_per_packet) : 24))} pcs)</span>
            </td>
            <td style="text-align: right;">${(item.price * item.quantity).toFixed(2)}</td>
        `;
        itemsBody.appendChild(tr);
    });

    document.getElementById("print-total").textContent = "GH₵" + lastSaleData.total;

    // Trigger Print with a delay to ensure the DOM is fully painted first
    setTimeout(() => {
        window.print();
    }, 400);
}

function closePopup() {
  const popup = document.getElementById("popup");
  const backdrop = document.getElementById("backdrop");
  if (popup && backdrop) {
    popup.classList.remove("active");
    backdrop.classList.remove("active");
    
    // Reset contents for next time
    setTimeout(() => {
        const content1 = document.getElementById("content1");
        const content2 = document.getElementById("content2");
        if (content1) content1.style.display = "block";
        if (content2) content2.style.display = "none";
        
        // Reset customer name
        const custInput = document.getElementById("customerName");
        if (custInput) custInput.value = "";
    }, 300);
  }
}
