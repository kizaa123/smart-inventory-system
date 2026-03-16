// API Configuration (Switch between Node.js and PHP for XAMPP)
let API_BASE_URL = 'http://localhost:5000/api'; // Default for local file:// testing
if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    API_BASE_URL = window.location.origin + '/api'; // Use current host for Port Forwarding
}

// Utility function to handle API requests
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

// ==================== PRODUCTS API ====================

const ProductAPI = {
  getAll: () => apiCall('/products'),
  getById: (id) => apiCall(`/products/${id}`),
  create: (productData) => apiCall('/products', 'POST', productData),
  update: (id, productData) => apiCall(`/products/${id}`, 'PUT', productData),
  delete: (id) => apiCall(`/products/${id}`, 'DELETE')
};

// ==================== CATEGORIES API ====================

const CategoryAPI = {
  getAll: () => apiCall('/categories'),
  create: (categoryData) => apiCall('/categories', 'POST', categoryData),
  update: (id, categoryData) => apiCall(`/categories/${id}`, 'PUT', categoryData),
  delete: (id) => apiCall(`/categories/${id}`, 'DELETE')
};

// ==================== SUPPLIERS API ====================

const SupplierAPI = {
  getAll: () => apiCall('/suppliers'),
  create: (supplierData) => apiCall('/suppliers', 'POST', supplierData),
  update: (id, supplierData) => apiCall(`/suppliers/${id}`, 'PUT', supplierData),
  delete: (id) => apiCall(`/suppliers/${id}`, 'DELETE')
};

// ==================== STAFF API ====================

const StaffAPI = {
  getAll: () => apiCall('/staff'),
  create: (staffData) => apiCall('/staff', 'POST', staffData),
  update: (id, staffData) => apiCall(`/staff/${id}`, 'PUT', staffData),
  delete: (id) => apiCall(`/staff/${id}`, 'DELETE')
};

// ==================== SALES API ====================

const SalesAPI = {
  create: (saleData) => apiCall('/sales', 'POST', saleData)
};

// ==================== DASHBOARD API ====================

const DashboardAPI = {
  getStats: () => apiCall('/dashboard/stats'),
  getRecentSales: (limit = 10) => apiCall(`/dashboard/recent-sales?limit=${limit}`),
  deleteActivity: (id) => apiCall(`/activities/${id}`, 'DELETE'),
  deleteAllActivities: () => apiCall('/activities', 'DELETE')
};

// ==================== REPORT API ====================

const ReportAPI = {
  getSales: (startDate, endDate, category) => {
    let url = '/reports/sales?';
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;
    if (category) url += `category=${category}`;
    // clean up trailing ampersand if present
    if (url.endsWith('&') || url.endsWith('?')) url = url.slice(0, -1);
    return apiCall(url);
  }
};
