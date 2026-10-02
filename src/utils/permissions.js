/**
 * Permissions & Role Access Utility
 * Standardizes role-based access control (RBAC) across menus, submenus, hubs, reports, and actions.
 */

export const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem('salesforce_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Checks if the user is an administrator or has all-access superuser rights.
 */
export const isUserAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role_code === 'ADMIN') return true;
  if (Array.isArray(user.allowed_modules) && user.allowed_modules.includes('all_access')) return true;
  return false;
};

/**
 * Checks if user has access to a specific submenu / feature id.
 */
export const hasSubmenuPermission = (user, subId, parentId = null) => {
  if (isUserAdmin(user)) return true;
  const modules = user?.allowed_modules;
  if (!Array.isArray(modules)) return false;

  if (modules.includes('all_access')) return true;
  if (modules.includes(subId)) return true;
  if (parentId && modules.includes(parentId)) return true;

  // Aliases and special parent groupings
  if ((parentId === 'products-stock' || parentId === 'products-inventory') && 
      (modules.includes('products') || modules.includes('stock') || modules.includes('products-stock'))) {
    return true;
  }

  if (parentId === 'purchases-vendors' && 
      (modules.includes('purchases') || modules.includes('vendors') || modules.includes('purchases-vendors'))) {
    return true;
  }

  return false;
};

/**
 * Checks if user has access to any submenu in a group or the parent menu.
 */
export const hasMenuPermission = (user, subIds = [], parentId = null) => {
  if (isUserAdmin(user)) return true;
  const modules = user?.allowed_modules;
  if (!Array.isArray(modules)) return false;

  if (modules.includes('all_access')) return true;
  if (parentId && modules.includes(parentId)) return true;

  if ((parentId === 'products-stock' || parentId === 'products-inventory') && 
      (modules.includes('products') || modules.includes('stock') || modules.includes('products-stock'))) {
    return true;
  }

  if (parentId === 'purchases-vendors' && 
      (modules.includes('purchases') || modules.includes('vendors') || modules.includes('purchases-vendors'))) {
    return true;
  }

  if (Array.isArray(subIds) && subIds.some(id => modules.includes(id))) {
    return true;
  }

  return false;
};

/**
 * Specifically checks if user has permission for Purchases & Vendors.
 * If not granted:
 * - Purchases & Vendors menu is hidden
 * - Inward Stock action hides Vendor, Buy Price, Invoice Ref, and Vendor Bill upload
 * - Vendor reports (Vendor Wise Stock, Vendor Wise Payments) are hidden
 */
export const hasPurchasesVendorsPermission = (user) => {
  if (isUserAdmin(user)) return true;
  const modules = user?.allowed_modules;
  if (!Array.isArray(modules)) return false;

  if (modules.includes('all_access')) return true;

  return (
    modules.includes('purchases-vendors') ||
    modules.includes('stock-vendors') ||
    modules.includes('purchase-orders') ||
    modules.includes('vendor-payments') ||
    modules.includes('stock-invoice-docs')
  );
};

/**
 * Returns the first accessible navigation menu for a user based on their permissions.
 * Priority order matches the Sidebar navigation hierarchy:
 * 1. Dashboard
 * 2. Products & Stock ('products-stock')
 * 3. Purchases & Vendors ('purchases-vendors')
 * 4. Customers ('customers')
 * 5. Sales ('sales')
 * 6. Invoices ('invoices-list')
 * 7. Reports ('reports')
 * 8. Users & Roles ('users')
 * 9. Settings ('settings')
 */
export const getFirstAccessibleMenu = (user) => {
  if (!user) return 'dashboard';
  if (isUserAdmin(user)) return 'dashboard';
  if (hasSubmenuPermission(user, 'dashboard')) return 'dashboard';
  if (hasMenuPermission(user, ['products-list', 'stock-categories', 'products-price-groups', 'stock-total', 'stock-warehouses'], 'products-inventory')) return 'products-stock';
  if (hasPurchasesVendorsPermission(user) && hasMenuPermission(user, ['stock-vendors', 'stock-details', 'purchase-orders', 'warehouse-transfers', 'vendor-payments'], 'purchases-vendors')) return 'purchases-vendors';
  if (hasMenuPermission(user, ['customers-details', 'customers-price-mapping', 'customers-advance-booking', 'customers-credit-notes'], 'customers')) return 'customers';
  if (hasMenuPermission(user, ['sales-vehicles', 'sales-routes', 'sales-mappings', 'sales-stock-adding', 'sales-stock-requests', 'sales-v2v-transfers', 'sales-live-track', 'sales-returns', 'sales-expenses'], 'sales')) return 'sales';
  if (hasSubmenuPermission(user, 'invoices-list', 'invoices') || hasMenuPermission(user, ['invoices-list'], 'invoices')) return 'invoices-list';
  if (hasSubmenuPermission(user, 'reports')) return 'reports';
  if (hasMenuPermission(user, ['users-list', 'roles-list'], 'users')) return 'users';
  if (hasSubmenuPermission(user, 'settings')) return 'settings';
  return 'dashboard';
};

