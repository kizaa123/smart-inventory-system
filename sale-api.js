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
let camScannerTargetInput = 'barcodeInput';
let camScannerAutoSubmit = false;

function openCamScanner(targetInputId = 'barcodeInput', autoSubmit = false) {
  camScannerTargetInput = targetInputId;
  camScannerAutoSubmit = autoSubmit;
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
      { 
        fps: 60, 
        qrbox: { width: 380, height: 120 }, 
        aspectRatio: 1.77, 
        disableFlip: true,
        formatsToSupport: [ Html5QrcodeSupportedFormats.CODE_39 ]
      },
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

  // For the return modal, ONLY accept codes that look like Order IDs
  if (camScannerTargetInput === 'returnItemSku') {
    if (!code.toUpperCase().includes('ORD-') && !code.toUpperCase().includes('RET-')) {
      // Ignore product barcodes or other codes while in return mode
      setCamStatus('warn', `<i class="fa-solid fa-circle-info"></i> Input skipped: "${code}" (Not an Order ID)`);
      return;
    }
  }

  lastDetectedCode = code;
  setTimeout(() => { lastDetectedCode = null; }, 3000);

  // Just fill the text input and close the camera —
  closeCamScanner();

  const statusEl = document.getElementById('cam-status-msg');
  if (statusEl) {
    statusEl.innerHTML = '<i class="fa-solid fa-check-circle" style="color:#2e7d32;"></i> Scan Successful!';
    statusEl.classList.add('success-flash');
    if (navigator.vibrate) navigator.vibrate(100); // Haptic feedback if available
    setTimeout(() => statusEl.classList.remove('success-flash'), 1000);
  }

  const input = document.getElementById(camScannerTargetInput);
  if (input) {
    input.value = code.trim();
    input.focus();
    input.select();
    
    if (camScannerAutoSubmit && camScannerTargetInput === 'returnItemSku') {
      // Small delay just to let UI settle
      setTimeout(() => searchReturnByOrderId(), 100);
    }
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
  const returnSelect = document.getElementById('returnStaffSelect');
  
  if (select) select.innerHTML = '<option value="">Select Staff Member</option>';
  if (returnSelect) returnSelect.innerHTML = '<option value="">Select Staff Member</option>';
  
  staffData.forEach(staff => {
    if (select) {
      const option = document.createElement('option');
      option.value = staff.id;
      option.textContent = staff.name;
      select.appendChild(option);
    }
    if (returnSelect) {
      const option2 = document.createElement('option');
      option2.value = staff.id;
      option2.textContent = staff.name;
      returnSelect.appendChild(option2);
    }
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
      document.getElementById('successOrderId').textContent = response.order_id;
      
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
    document.getElementById("print-order-id").textContent = lastSaleData.order_id;
    document.getElementById("print-server").textContent = lastSaleData.staff_name;
    
    if (lastSaleData.customer_name) {
        document.getElementById("print-customer").textContent = lastSaleData.customer_name;
        document.getElementById("print-customer-row").style.display = "flex";
    } else {
        document.getElementById("print-customer-row").style.display = "none";
    }

    const actionRow = document.getElementById("print-action-row");
    if (actionRow) {
        if (lastSaleData.action) {
            document.getElementById("print-action").textContent = lastSaleData.action;
            actionRow.style.display = "flex";
        } else {
            actionRow.style.display = "none";
        }
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
    
    // Populate Barcode (Offline-Ready SVG)
    const barcodeEl = document.getElementById("print-barcode");
    const barcodeFooterEl = document.getElementById("print-order-id-footer");
    
    if (barcodeEl && window.BarcodeGen) {
        // High density barcode with maximum thickness for thermal paper
        barcodeEl.innerHTML = window.BarcodeGen.generateSVG(lastSaleData.order_id, { height: 50, width: 2.0 });
    }
    
    if (barcodeFooterEl) {
        barcodeFooterEl.textContent = lastSaleData.order_id;
    }

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

// ==================== RETURN LOGIC ====================
let currentReturnOrder = null;
let returnItemsData = []; 

function openReturnModal() {
  const backdrop = document.getElementById('return-backdrop');
  const modal = document.getElementById('return-modal');
  if (!backdrop || !modal) return;
  backdrop.style.display = 'block';
  modal.style.display = 'block';
  document.getElementById('return-step-1').style.display = 'block';
  document.getElementById('return-step-2').style.display = 'none';
  document.getElementById('returnItemSku').value = '';
  document.getElementById('return-orders-list').innerHTML = '';
  setTimeout(() => document.getElementById('returnItemSku').focus(), 100);
}

function closeReturnModal() {
  const backdrop = document.getElementById('return-backdrop');
  if (backdrop) backdrop.style.display = 'none';
  const modal = document.getElementById('return-modal');
  if (modal) modal.style.display = 'none';
  currentReturnOrder = null;
  returnItemsData = [];
}

function backToReturnSearch() {
  document.getElementById('return-step-1').style.display = 'block';
  document.getElementById('return-step-2').style.display = 'none';
  currentReturnOrder = null;
  returnItemsData = [];
}

async function searchReturnByOrderId() {
  const rawOrderId = document.getElementById('returnItemSku').value.trim();
  if (!rawOrderId) return;

  // Clean the order ID (remove barcode start/stop chars like * and UI symbols like #)
  let orderId = rawOrderId.replace(/[*#]/g, '').trim().toUpperCase();
  const list = document.getElementById('return-orders-list');
  list.innerHTML = '<div style="text-align:center; padding:10px;"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';

  let cleanOrderId = orderId;
  if (cleanOrderId && !cleanOrderId.startsWith('ORD-') && !cleanOrderId.startsWith('RET-')) {
    cleanOrderId = 'ORD-' + cleanOrderId;
  }

  try {
    const res = await fetch('/api/sales/order/' + encodeURIComponent(cleanOrderId));
    if (!res.ok) throw new Error('Search failed');
    const items = await res.json();
    
    if (items.length === 0) {
      list.innerHTML = '<div style="color:#c62828; padding:10px;">❌ Order not found or no items available to return.</div>';
      return;
    }

    list.innerHTML = '';
    
    // Jump straight to step 2 with the loaded items
    document.getElementById('return-step-1').style.display = 'none';
    document.getElementById('return-step-2').style.display = 'block';
    document.getElementById('return-order-title').textContent = 'Order ' + cleanOrderId;
    
    // Populate receipt data for reprinting
    const orderDate = items.length > 0 && items[0].sale_date ? new Date(items[0].sale_date).toLocaleString() : '';
    document.getElementById('return-order-date').textContent = orderDate;
    
    lastSaleData = {
        order_id: cleanOrderId,
        date: orderDate || new Date().toLocaleString(),
        staff_name: items.length > 0 && items[0].staff_name ? items[0].staff_name : 'System',
        customer_name: '', 
        items: items.map(i => ({
           name: i.product_name,
           price: i.unit_price,
           quantity: i.quantity,
           pieces_per_packet: i.pieces_per_packet
        })),
        total: items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0).toFixed(2)
    };

    const reprintBtn = document.getElementById('btn-reprint-receipt');
    if (reprintBtn) reprintBtn.style.display = 'inline-block';
    
    currentReturnOrder = cleanOrderId;
    returnItemsData = items.map(i => ({
      ...i,
      return_quantity: 0
    }));

    renderReturnItems();
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div style="color:#c62828; padding:10px;">❌ Error processing search.</div>';
  }
}

function renderReturnItems() {
  const container = document.getElementById('return-items-container');
  container.innerHTML = '';

  if (returnItemsData.length === 0) {
    container.innerHTML = '<div>No items available to return in this order.</div>';
    return;
  }

  returnItemsData.forEach(item => {
    const imgUrl = item.image_url || 'https://via.placeholder.com/50?text=Item';
    const row = document.createElement('div');
    row.className = 'return-item-row';
    
    const ppp = (item.pieces_per_packet && parseInt(item.pieces_per_packet) > 1) ? parseInt(item.pieces_per_packet) : 24;
 
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; flex:1;">
        <img src="${imgUrl}" style="width:45px; height:45px; border-radius:8px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/45?text=Item'">
        <div>
          <div style="font-weight:700; font-size:14px; color:var(--text-main);">${item.product_name}</div>
          <div style="font-size:12px; color:var(--text-muted);">Bought: ${formatFraction(item.quantity)} Pkts @ GH₵${item.unit_price.toFixed(2)}</div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
        <div style="display:flex; align-items:center; gap:4px; background:var(--background-color); border:1px solid var(--border-color); border-radius:8px; padding:3px;">
          <button style="border:none; background:transparent; width:30px; height:30px; cursor:pointer; font-weight:bold; color:#d32f2f;" onclick="updateReturnQty(${item.product_id}, -0.25, ${item.quantity})">-</button>
          <span style="font-size:15px; font-weight:700; min-width:35px; text-align:center; color:var(--text-main);">${formatFraction(item.return_quantity)}</span>
          <button style="border:none; background:transparent; width:30px; height:30px; cursor:pointer; font-weight:bold; color:#2e7d32;" onclick="updateReturnQty(${item.product_id}, 0.25, ${item.quantity})">+</button>
        </div>
        <div style="font-size:11px; color:var(--text-muted); font-weight: 500;">(Return ${Math.round(item.return_quantity * ppp)} pcs)</div>
      </div>
    `;
    container.appendChild(row);
  });

  updateReturnTotals();
}

function updateReturnQty(productId, change, maxQty) {
  const item = returnItemsData.find(i => i.product_id === productId);
  if (item) {
    let newQty = item.return_quantity + change;
    newQty = Math.round(newQty * 4) / 4; 
    
    if (newQty < 0) newQty = 0;
    if (newQty > maxQty) {
      newQty = maxQty;
      alert('Cannot return more than purchased.');
    }
    item.return_quantity = newQty;
    renderReturnItems();
  }
}

function updateReturnTotals() {
  const total = returnItemsData.reduce((sum, item) => sum + (item.return_quantity * item.unit_price), 0);
  document.getElementById('return-refund-total').innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${total.toFixed(2)}`;
  
  const btn = document.getElementById('processReturnBtn');
  if (total > 0) {
    btn.disabled = false;
    btn.style.opacity = '1';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.5';
  }
}

async function processReturnSubmit() {
  const staffId = document.getElementById('returnStaffSelect').value;
  if (!staffId) {
    alert('Please select a staff member to process this return.');
    return;
  }

  const itemsToReturn = returnItemsData.filter(i => i.return_quantity > 0);
  if (itemsToReturn.length === 0) return;

  const btn = document.getElementById('processReturnBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_order_id: currentReturnOrder,
        staff_id: parseInt(staffId),
        items: itemsToReturn
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Refund failed');

    const staffName = document.getElementById('returnStaffSelect').options[document.getElementById('returnStaffSelect').selectedIndex].text;
    const updatedTotal = returnItemsData.reduce((sum, item) => sum + ((item.quantity - item.return_quantity) * item.unit_price), 0);
    
    lastSaleData = {
        order_id: data.return_order_id,
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        staff_name: staffName,
        customer_name: '',
        action: 'Refund',
        items: returnItemsData.map(item => ({
           name: item.product_name,
           price: item.unit_price,
           quantity: (item.quantity - item.return_quantity),
           pieces_per_packet: item.pieces_per_packet
        })).filter(i => i.quantity > 0),
        total: updatedTotal.toFixed(2)
    };

    closeReturnModal();

    if (confirm(`✅ ${data.message}\nReturn Reference: ${data.return_order_id}\n\nWould you like to print the refund receipt?`)) {
        setTimeout(() => {
            printReceipt();
        }, 300);
    }
    // Reload products so inventory quantities are updated
    const products = await ProductAPI.getAll();
    productsData = products || [];
    renderProducts();

  } catch (err) {
    console.error(err);
    alert('❌ Error: ' + err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
