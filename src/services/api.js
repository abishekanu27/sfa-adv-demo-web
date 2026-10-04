export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DEMO_CREDENTIALS = {
  admin: {
    username: 'admin',
    email: 'admin@salesforce.com',
    name: 'Administrator',
    role: 'ADMIN',
    roleTitle: 'Super Administrator',
    password: 'Admin123',
    department: 'Executive Administration',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  }
};

export const loginApi = async (usernameOrEmail, password, rememberMe = true) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password, rememberMe }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Authentication failed');
  }
  return data;
};

export const fetchSystemStatus = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/status`);
    if (!res.ok) throw new Error('API offline');
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      database: { connected: false, host: 'localhost', database: 'salesforce_db' }
    };
  }
};

export const fetchCompanySettings = async () => {
  try {
    const res = await fetch(`${API_BASE}/settings/company`);
    if (!res.ok) throw new Error('Failed to fetch company branding');
    const data = await res.json();
    if (data.settings) {
      localStorage.setItem('salesforce_company_settings', JSON.stringify(data.settings));
      window.dispatchEvent(new CustomEvent('companySettingsUpdated', { detail: data.settings }));
    }
    return data.settings;
  } catch (err) {
    try {
      const cached = localStorage.getItem('salesforce_company_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      company_name: '',
      portal_title: 'ERP Portal',
      tagline: 'Enterprise ERP Management Suite',
      logo_url: '',
      primary_color: '#3b82f6',
      secondary_color: '#6366f1',
      email: 'support@erp.com',
      phone: '+1 (555) 019-2834',
      address: '100 Enterprise Boulevard, Suite 500, Tech City',
      tax_id: 'TAX-9948271',
      currency: 'INR (₹)'
    };
  }
};

export const updateCompanySettingsApi = async (settings) => {
  const res = await fetch(`${API_BASE}/settings/company`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to save company branding');
  }
  if (data.settings) {
    localStorage.setItem('salesforce_company_settings', JSON.stringify(data.settings));
    window.dispatchEvent(new CustomEvent('companySettingsUpdated', { detail: data.settings }));
  }
  return data;
};

export const fetchDashboardData = async (userEmail) => {
  try {
    const url = userEmail ? `${API_BASE}/dashboard?email=${encodeURIComponent(userEmail)}` : `${API_BASE}/dashboard`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load dashboard data');
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('API error fetching dashboard data, using zero-state fallback:', err);
    return null;
  }
};

export const createSalesOrderApi = async (orderData) => {
  const res = await fetch(`${API_BASE}/dashboard/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create sales order');
  return data;
};

export const allocateFieldRepApi = async (repData) => {
  const res = await fetch(`${API_BASE}/dashboard/salesmen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(repData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to allocate field representative');
  return data;
};

// ==========================================
// PRODUCTS & CATEGORIES APIS
// ==========================================

export const fetchCategoriesApi = async () => {
  try {
    const res = await fetch(`${API_BASE}/products/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchCategoriesApi:', err);
    return [];
  }
};

export const createCategoryApi = async (categoryData) => {
  const res = await fetch(`${API_BASE}/products/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create category');
  return json.data;
};

export const fetchProductsApi = async (category = 'All', search = '') => {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search && search.trim()) params.append('search', search.trim());
    
    const url = `${API_BASE}/products${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch products');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchProductsApi:', err);
    return [];
  }
};

export const fetchProductByIdApi = async (id) => {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product details');
  const json = await res.json();
  return json.data;
};

export const createProductApi = async (productData) => {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create product');
  return json.data;
};

export const updateProductApi = async (id, productData) => {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update product');
  return json.data;
};

export const deleteProductApi = async (id) => {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete product');
  return json;
};

// ==========================================
// SELLING PRICE GROUPS APIS
// ==========================================

export const fetchPriceGroupsApi = async () => {
  try {
    const res = await fetch(`${API_BASE}/price-groups`);
    if (!res.ok) throw new Error('Failed to fetch selling price groups');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchPriceGroupsApi:', err);
    return [];
  }
};

export const createPriceGroupApi = async (groupData) => {
  const res = await fetch(`${API_BASE}/price-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create price group');
  return json.data;
};

export const deletePriceGroupApi = async (id) => {
  const res = await fetch(`${API_BASE}/price-groups/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete price group');
  return json;
};

export const fetchGroupProductPricesApi = async (groupId) => {
  const res = await fetch(`${API_BASE}/price-groups/${groupId}/products`);
  if (!res.ok) throw new Error('Failed to fetch products for price group');
  const json = await res.json();
  return json;
};

export const updateGroupProductPricesApi = async (groupId, prices) => {
  const res = await fetch(`${API_BASE}/price-groups/${groupId}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prices })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save product prices');
  return json;
};

export const fetchProductPricesByProductApi = async (productId) => {
  try {
    const res = await fetch(`${API_BASE}/price-groups/product/${productId}`);
    if (!res.ok) throw new Error('Failed to fetch product prices');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchProductPricesByProductApi:', err);
    return [];
  }
};

export const updateProductGroupPricesByProductApi = async (productId, prices) => {
  const res = await fetch(`${API_BASE}/price-groups/product/${productId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prices })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save product price group rates');
  return json;
};

// ==========================================
// VENDOR DETAILS APIS
// ==========================================

export const fetchVendorsApi = async (search = '', category = 'All') => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);

    const res = await fetch(`${API_BASE}/vendors?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch vendors');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchVendorsApi:', err);
    return [];
  }
};

export const fetchVendorMetricsApi = async () => {
  try {
    const res = await fetch(`${API_BASE}/vendors/metrics`);
    if (!res.ok) throw new Error('Failed to fetch vendor metrics');
    const json = await res.json();
    return json.data || {
      total_vendors: 0,
      total_inward_procurement: 0,
      outstanding_payables: 0,
      active_advance_balance: 0
    };
  } catch (err) {
    console.warn('Error in fetchVendorMetricsApi:', err);
    return {
      total_vendors: 0,
      total_inward_procurement: 0,
      outstanding_payables: 0,
      active_advance_balance: 0
    };
  }
};

export const createVendorApi = async (vendorData) => {
  const res = await fetch(`${API_BASE}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create vendor');
  return json.data;
};

export const updateVendorApi = async (id, vendorData) => {
  const res = await fetch(`${API_BASE}/vendors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update vendor');
  return json.data;
};

export const deleteVendorApi = async (id) => {
  const res = await fetch(`${API_BASE}/vendors/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete vendor');
  return json;
};

// ==========================================
// VENDOR PAYMENTS & BALANCE APIS
// ==========================================

export const fetchVendorPaymentsApi = async (vendorId = '', search = '', status = 'All') => {
  try {
    const params = new URLSearchParams();
    if (vendorId && vendorId !== 'All') params.append('vendor_id', vendorId);
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);

    const res = await fetch(`${API_BASE}/vendors/payments?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch vendor payments');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchVendorPaymentsApi:', err);
    return [];
  }
};

export const createVendorPaymentApi = async (paymentData) => {
  const res = await fetch(`${API_BASE}/vendors/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to record vendor payment');
  return json;
};

export const deleteVendorPaymentApi = async (id) => {
  const res = await fetch(`${API_BASE}/vendors/payments/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete vendor payment');
  return json;
};

// ==========================================
// STOCK & INVENTORY APIS
// ==========================================

export const fetchStockEntriesApi = async (search = '', category = 'All', vendorId = '', productId = '') => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);
    if (vendorId) params.append('vendor_id', vendorId);
    if (productId) params.append('product_id', productId);

    const res = await fetch(`${API_BASE}/stocks?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch stock entries');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchStockEntriesApi:', err);
    return [];
  }
};

export const fetchTotalStockApi = async (search = '', category = 'All') => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);

    const res = await fetch(`${API_BASE}/stocks/total?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch total stock');
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('Error in fetchTotalStockApi:', err);
    return { data: [], metrics: { total_products: 0, total_stock_units: 0, total_valuation: 0, low_stock_count: 0 } };
  }
};

export const fetchProductStockHistoryApi = async (productId) => {
  try {
    const res = await fetch(`${API_BASE}/stocks/product/${productId}`);
    if (!res.ok) throw new Error('Failed to fetch stock history for product');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchProductStockHistoryApi:', err);
    return [];
  }
};

export const createStockEntryApi = async (stockData) => {
  const res = await fetch(`${API_BASE}/stocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stockData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to record stock inward entry');
  return json.data;
};

export const deleteStockEntryApi = async (id) => {
  const res = await fetch(`${API_BASE}/stocks/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete stock entry');
  return json;
};

// ==========================================
// PURCHASE ORDERS (PO) APIS
// ==========================================

export const fetchPurchaseOrdersApi = async (search = '', status = 'All', vendorId = 'All') => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);
    if (vendorId && vendorId !== 'All') params.append('vendor_id', vendorId);

    const res = await fetch(`${API_BASE}/stocks/purchase-orders?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch purchase orders');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchPurchaseOrdersApi:', err);
    return [];
  }
};

export const createPurchaseOrderApi = async (poData) => {
  const res = await fetch(`${API_BASE}/stocks/purchase-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(poData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create purchase order');
  return json.data;
};

export const updatePurchaseOrderStatusApi = async (id, status, notes = '') => {
  const res = await fetch(`${API_BASE}/stocks/purchase-orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update purchase order');
  return json.data;
};

export const deletePurchaseOrderApi = async (id) => {
  const res = await fetch(`${API_BASE}/stocks/purchase-orders/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete purchase order');
  return json;
};

// ==========================================
// WAREHOUSE TRANSFERS APIS
// ==========================================

export const fetchWarehouseTransfersApi = async (search = '', status = 'All') => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);

    const res = await fetch(`${API_BASE}/stocks/transfers?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch warehouse transfers');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchWarehouseTransfersApi:', err);
    return [];
  }
};

export const createWarehouseTransferApi = async (transferData) => {
  const res = await fetch(`${API_BASE}/stocks/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create warehouse transfer');
  return json.data;
};

export const deleteWarehouseTransferApi = async (id) => {
  const res = await fetch(`${API_BASE}/stocks/transfers/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete warehouse transfer');
  return json;
};

// ==========================================
// CUSTOMERS & PRICE GROUP MAPPING APIS
// ==========================================

export const fetchCustomersApi = async (search = '', priceGroupId = 'all', status = 'all', gstType = 'all') => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (priceGroupId && priceGroupId !== 'all') params.append('price_group_id', priceGroupId);
    if (status && status !== 'all') params.append('status', status);
    if (gstType && gstType !== 'all') params.append('gst_type', gstType);

    const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Error in fetchCustomersApi:', err);
    return [];
  }
};

export const fetchCustomerMetricsApi = async () => {
  try {
    const res = await fetch(`${API_BASE}/customers/metrics`);
    if (!res.ok) throw new Error('Failed to fetch customer metrics');
    const json = await res.json();
    return json.data || {
      total_customers: 0,
      active_customers: 0,
      total_outstanding: 0,
      price_groups_mapped: 0,
      unassigned_customers: 0
    };
  } catch (err) {
    console.warn('Error in fetchCustomerMetricsApi:', err);
    return {
      total_customers: 0,
      active_customers: 0,
      total_outstanding: 0,
      price_groups_mapped: 0,
      unassigned_customers: 0
    };
  }
};

export const fetchCustomerMappingSummaryApi = async () => {
  try {
    const res = await fetch(`${API_BASE}/customers/mapping-summary`);
    if (!res.ok) throw new Error('Failed to fetch mapping summary');
    const json = await res.json();
    return json.data || { price_groups: [], unassigned_count: 0 };
  } catch (err) {
    console.warn('Error in fetchCustomerMappingSummaryApi:', err);
    return { price_groups: [], unassigned_count: 0 };
  }
};

export const fetchCustomerByIdApi = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch customer details');
  const json = await res.json();
  return json.data;
};

export const fetchNextCustomerCodeApi = async () => {
  try {
    const res = await fetch(`${API_BASE}/customers/next-code`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.nextCode;
  } catch (err) {
    return null;
  }
};

export const createCustomerApi = async (customerData) => {
  const res = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create customer');
  return json.data;
};

export const updateCustomerApi = async (id, customerData) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update customer');
  return json.data;
};

export const deleteCustomerApi = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete customer');
  return json;
};

export const updateCustomerPriceGroupApi = async (id, priceGroupId) => {
  const res = await fetch(`${API_BASE}/customers/${id}/price-group`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price_group_id: priceGroupId })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update customer price group');
  return json;
};

export const bulkUpdateCustomerPriceGroupsApi = async (customerIds, priceGroupId) => {
  const res = await fetch(`${API_BASE}/customers/bulk-price-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_ids: customerIds, price_group_id: priceGroupId })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to apply bulk price group mapping');
  return json;
};

// ==========================================
// ROLES & USERS API
// ==========================================

export const fetchRolesApi = async () => {
  const res = await fetch(`${API_BASE}/roles`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch roles');
  return json.roles || [];
};

export const createRoleApi = async (roleData) => {
  const res = await fetch(`${API_BASE}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roleData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create role');
  return json;
};

export const updateRoleApi = async (roleId, roleData) => {
  const res = await fetch(`${API_BASE}/roles/${roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roleData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update role');
  return json;
};

export const deleteRoleApi = async (roleId) => {
  const res = await fetch(`${API_BASE}/roles/${roleId}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete role');
  return json;
};

export const fetchUsersApi = async () => {
  const res = await fetch(`${API_BASE}/users`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch users');
  return json.users || [];
};

export const fetchSalesExecutivesApi = async () => {
  try {
    const users = await fetchUsersApi();
    return users.filter(u => u.role === 'SALES_EXECUTIVE' || (u.department && u.department.toLowerCase().includes('sales')));
  } catch (err) {
    console.error('Failed to fetch sales reps:', err);
    return [];
  }
};

export const createUserApi = async (userData) => {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create user');
  return json;
};

export const updateUserApi = async (userId, userData) => {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update user');
  return json;
};

export const toggleUserStatusApi = async (userId) => {
  const res = await fetch(`${API_BASE}/users/${userId}/status`, {
    method: 'PATCH'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to toggle user status');
  return json;
};

export const deleteUserApi = async (userId) => {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete user');
  return json;
};

// ==========================================
// REPORTS APIS (11 Specialized Enterprise Reports)
// ==========================================

export const fetchReportsSummary = async () => {
  try {
    const res = await fetch(`${API_BASE}/reports/metrics`);
    if (!res.ok) throw new Error('Failed to fetch reports summary metrics');
    const json = await res.json();
    return json.metrics;
  } catch (err) {
    console.error('Error fetching reports metrics:', err);
    return null;
  }
};

export const fetchReportData = async (reportEndpoint, queryParams = {}) => {
  try {
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });

    const queryString = searchParams.toString();
    const url = `${API_BASE}/reports/${reportEndpoint}${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch report from ${reportEndpoint}`);
    return await res.json();
  } catch (err) {
    console.error(`Error fetching report [${reportEndpoint}]:`, err);
    throw err;
  }
};

// ==========================================
// INVOICES APIS (Dedicated Invoice Management)
// ==========================================
export const fetchInvoicesApi = async (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') searchParams.append(k, v);
  });
  const qs = searchParams.toString();
  const res = await fetch(`${API_BASE}/invoices${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return await res.json();
};

export const createInvoiceApi = async (invoiceData) => {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create invoice');
  return data;
};

export const updateInvoiceApi = async (invoiceId, invoiceData) => {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update invoice');
  return data;
};

export const updateInvoiceStatusApi = async (invoiceId, statusData) => {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update invoice status');
  return data;
};

export const deleteInvoiceApi = async (invoiceId) => {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete invoice');
  return data;
};

// ==========================================
// WAREHOUSES APIS
// ==========================================
export const fetchWarehousesApi = async (search = '') => {
  const url = search ? `${API_BASE}/stocks/warehouses?search=${encodeURIComponent(search)}` : `${API_BASE}/stocks/warehouses`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  const json = await res.json();
  return json.warehouses || [];
};

export const createWarehouseApi = async (whData) => {
  const res = await fetch(`${API_BASE}/stocks/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(whData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create warehouse');
  return data;
};

export const updateWarehouseApi = async (whId, whData) => {
  const res = await fetch(`${API_BASE}/stocks/warehouses/${whId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(whData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update warehouse');
  return data;
};

export const deleteWarehouseApi = async (whId) => {
  const res = await fetch(`${API_BASE}/stocks/warehouses/${whId}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete warehouse');
  return data;
};

// ==========================================
// BULK IMPORT APIS
// ==========================================
export const bulkImportStockApi = async (entries) => {
  const res = await fetch(`${API_BASE}/stocks/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to import stock entries');
  return data;
};

export const bulkImportCustomersApi = async (customers) => {
  const res = await fetch(`${API_BASE}/customers/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to import customers');
  return data;
};

// ==========================================
// SALESMAN STOCK REQUESTS & TRANSFERS & TRACKING
// ==========================================
export const fetchSalesmanStockRequestsApi = async (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') searchParams.append(k, v);
  });
  const qs = searchParams.toString();
  const res = await fetch(`${API_BASE}/sales/stock-requests${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch stock requests');
  const json = await res.json();
  return json.requests || [];
};

export const createSalesmanStockRequestApi = async (reqData) => {
  const res = await fetch(`${API_BASE}/sales/stock-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create stock request');
  return data;
};

export const updateStockRequestStatusApi = async (id, statusData) => {
  const res = await fetch(`${API_BASE}/sales/stock-requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update stock request');
  return data;
};

export const deleteStockRequestApi = async (id) => {
  const res = await fetch(`${API_BASE}/sales/stock-requests/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete stock request');
  return data;
};

export const fetchVanToVanTransfersApi = async (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') searchParams.append(k, v);
  });
  const qs = searchParams.toString();
  const res = await fetch(`${API_BASE}/sales/v2v-transfers${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch van to van transfers');
  const json = await res.json();
  return json.transfers || [];
};

export const createVanToVanTransferApi = async (transferData) => {
  const res = await fetch(`${API_BASE}/sales/v2v-transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create transfer');
  return data;
};

export const updateVanToVanTransferStatusApi = async (id, statusData) => {
  const res = await fetch(`${API_BASE}/sales/v2v-transfers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update transfer status');
  return data;
};

export const deleteVanToVanTransferApi = async (id) => {
  const res = await fetch(`${API_BASE}/sales/v2v-transfers/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete transfer');
  return data;
};

export const fetchSalesmanLiveTrackingApi = async () => {
  const res = await fetch(`${API_BASE}/sales/live-tracking`);
  if (!res.ok) throw new Error('Failed to fetch live tracking');
  const json = await res.json();
  const trackingList = json.tracking || [];
  trackingList._customers = json.customers || [];
  return trackingList;
};

// ==========================================
// CREDIT NOTES APIS
// ==========================================
export const fetchCreditNotesApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.customer_id) query.append('customer_id', params.customer_id);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.status && params.status !== 'All') query.append('status', params.status);

  const res = await fetch(`${API_BASE}/credit-notes?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch credit notes');
  return await res.json();
};

export const createCreditNoteApi = async (creditNoteData) => {
  const res = await fetch(`${API_BASE}/credit-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creditNoteData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create credit note');
  return data;
};

export const deleteCreditNoteApi = async (id) => {
  const res = await fetch(`${API_BASE}/credit-notes/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete credit note');
  return data;
};

// ==========================================
// EXPENSES APIS
// ==========================================
export const fetchExpensesApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.salesman_id && params.salesman_id !== 'all' && params.salesman_id !== 'All') {
    query.append('salesman_id', params.salesman_id);
  }
  if (params.category && params.category !== 'all' && params.category !== 'All') {
    query.append('category', params.category);
  }
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const res = await fetch(`${API_BASE}/expenses?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return await res.json();
};

export const createExpenseApi = async (expenseData) => {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to record expense');
  return data;
};

export const fetchExpenseReportApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.salesman_id && params.salesman_id !== 'all' && params.salesman_id !== 'All') {
    query.append('salesman_id', params.salesman_id);
  }
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);

  const res = await fetch(`${API_BASE}/expenses/report?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch expense report');
  return await res.json();
};

// ==========================================
// ROUTE MASTER APIS
// ==========================================
export const fetchRoutesApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.district && params.district !== 'all') query.append('district', params.district);
  if (params.status && params.status !== 'all') query.append('status', params.status);

  const res = await fetch(`${API_BASE}/sales/routes?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch routes');
  return await res.json();
};

export const createRouteApi = async (routeData) => {
  const res = await fetch(`${API_BASE}/sales/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(routeData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create route');
  return data;
};

export const updateRouteApi = async (routeId, routeData) => {
  const res = await fetch(`${API_BASE}/sales/routes/${routeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(routeData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update route');
  return data;
};

export const deleteRouteApi = async (routeId) => {
  const res = await fetch(`${API_BASE}/sales/routes/${routeId}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete route');
  return data;
};





