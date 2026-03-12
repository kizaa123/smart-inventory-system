// API Configuration (Switch between Node.js and PHP for XAMPP)
// const API_BASE_URL = 'http://172.26.62.240:5000/api'; // Node.js (Local Network)
const API_BASE_URL = 'http://localhost:5000/api'; // Node.js (Local only)
// const API_BASE_URL = 'http://localhost/inventory website/backend/api.php?action='; // PHP

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
  deleteActivity: (id) => apiCall(`/activities/${id}`, 'DELETE')
};
