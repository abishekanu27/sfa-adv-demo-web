import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Compass,
  CheckSquare,
  Square,
  Building,
  Building2,
  Layers,
  ArrowRight,
  Eye,
  Calendar,
  FileText
} from 'lucide-react';
import {
  fetchRoutesApi,
  createRouteApi,
  updateRouteApi,
  deleteRouteApi,
  fetchBranchesApi
} from '../../services/api';
import { getUserFromStorage, isUserAdmin } from '../../utils/permissions';
import { KERALA_DISTRICTS, getLocalAreasForKeralaDistrict } from '../../data/locationData';
import './RouteManagement.css';

export const RouteManagement = () => {
  const currentUser = getUserFromStorage();
  const isAdmin = isUserAdmin(currentUser);
  const userBranchId = currentUser?.branch_id || null;

  const [routes, setRoutes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [metrics, setMetrics] = useState({
    total_routes: 0,
    active_routes: 0,
    districts_covered: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState(isAdmin ? 'all' : (userBranchId ? String(userBranchId) : 'all'));
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [viewingRoute, setViewingRoute] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAreaInput, setCustomAreaInput] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    route_code: '',
    route_name: '',
    district: 'Ernakulam',
    state: 'Kerala',
    local_areas: [],
    description: '',
    status: 'Active',
    branch_id: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load branches list
  useEffect(() => {
    fetchBranchesApi()
      .then(res => {
        const bList = Array.isArray(res) ? res : [];
        setBranches(bList);
      })
      .catch(err => console.warn('Could not load branches in RouteManagement:', err));
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const res = await fetchRoutesApi({
        search: searchQuery,
        district: districtFilter,
        status: statusFilter,
        branch_id: branchFilter
      });
      if (res.success) {
        setRoutes(res.routes || []);
        if (res.metrics) setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
      showNotification('Failed to load routes list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, [searchQuery, districtFilter, statusFilter, branchFilter]);

  const handleOpenAddModal = () => {
    setEditingRoute(null);
    const initialDistrict = 'Ernakulam';
    const areas = getLocalAreasForKeralaDistrict(initialDistrict);
    const defaultAreas = areas.slice(0, 3);

    // Auto calculate next route code
    const maxCode = routes.reduce((max, r) => {
      const match = (r.route_code || '').match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        return val > max ? val : max;
      }
      return max;
    }, 0);
    const nextCode = `RT-${String(maxCode + 1).padStart(3, '0')}`;

    const defaultBranchId = !isAdmin
      ? (userBranchId || (branches[0]?.branch_id || ''))
      : (branchFilter !== 'all' ? branchFilter : (branches[0]?.branch_id || ''));

    setFormData({
      route_code: nextCode,
      route_name: '',
      district: initialDistrict,
      state: 'Kerala',
      local_areas: defaultAreas,
      description: '',
      status: 'Active',
      branch_id: defaultBranchId
    });
    setCustomAreaInput('');
    setShowModal(true);
  };

  const handleOpenEditModal = (r, e) => {
    if (e) e.stopPropagation();
    setEditingRoute(r);

    let parsedAreas = [];
    try {
      parsedAreas = Array.isArray(r.local_areas) ? r.local_areas : JSON.parse(r.local_areas || '[]');
    } catch {
      parsedAreas = [];
    }

    const currentBranchId = r.branch_id || (!isAdmin ? (userBranchId || '') : (branches[0]?.branch_id || ''));

    setFormData({
      route_code: r.route_code || '',
      route_name: r.route_name || '',
      district: r.district || 'Ernakulam',
      state: r.state || 'Kerala',
      local_areas: parsedAreas,
      description: r.description || '',
      status: r.status || 'Active',
      branch_id: currentBranchId
    });
    setCustomAreaInput('');
    setShowModal(true);
  };

  const handleOpenViewModal = (r, e) => {
    if (e) e.stopPropagation();
    setViewingRoute(r);
  };

  const handleDistrictChange = (dist) => {
    const areas = getLocalAreasForKeralaDistrict(dist);
    setFormData(prev => ({
      ...prev,
      district: dist,
      local_areas: areas.slice(0, 3)
    }));
  };

  const handleToggleArea = (area) => {
    setFormData(prev => {
      const exists = prev.local_areas.includes(area);
      const updated = exists 
        ? prev.local_areas.filter(a => a !== area) 
        : [...prev.local_areas, area];
      return { ...prev, local_areas: updated };
    });
  };

  const handleSelectAllDistrictAreas = () => {
    const allAreas = getLocalAreasForKeralaDistrict(formData.district);
    setFormData(prev => ({
      ...prev,
      local_areas: prev.local_areas.length === allAreas.length ? [] : allAreas
    }));
  };

  const handleAddCustomArea = (e) => {
    e.preventDefault();
    const val = customAreaInput.trim();
    if (!val) return;
    if (!formData.local_areas.includes(val)) {
      setFormData(prev => ({
        ...prev,
        local_areas: [...prev.local_areas, val]
      }));
    }
    setCustomAreaInput('');
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (!formData.route_name.trim()) {
      showNotification('Route Name is required', 'error');
      return;
    }
    if (!formData.district.trim()) {
      showNotification('District is required', 'error');
      return;
    }
    if (!formData.branch_id) {
      showNotification('Assigned Branch is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingRoute) {
        await updateRouteApi(editingRoute.route_id, formData);
        showNotification(`Route "${formData.route_name}" updated successfully!`);
      } else {
        await createRouteApi(formData);
        showNotification(`Route "${formData.route_name}" created successfully!`);
      }
      setShowModal(false);
      setEditingRoute(null);
      await loadRoutes();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Error saving route', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoute = async (r, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete route "${r.route_name}"?`)) return;

    try {
      await deleteRouteApi(r.route_id);
      showNotification(`Route "${r.route_name}" deleted successfully!`);
      await loadRoutes();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to delete route', 'error');
    }
  };

  // Helper to resolve branch name for display
  const getBranchDisplayName = (bId, fallbackName) => {
    if (!bId) return fallbackName || 'Main Branch & Central Depot';
    const found = branches.find(b => String(b.branch_id) === String(bId));
    return found ? found.branch_name : (fallbackName || 'Main Branch & Central Depot');
  };

  return (
    <div className="route-management-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`notification-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="metrics-summary-strip">
        <div className="metric-box">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Navigation size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-title">TOTAL ROUTES</span>
            <div className="metric-val">{routes.length} Active Beats</div>
            <span className="metric-sub">Defined distribution corridors</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-title">ACTIVE ROUTES</span>
            <div className="metric-val">
              {routes.filter(r => r.status === 'Active').length} Routes
            </div>
            <span className="metric-sub">Ready for van mapping</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#faf5ff', color: '#9333ea' }}>
            <MapPin size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-title">DISTRICTS COVERED</span>
            <div className="metric-val">
              {new Set(routes.map(r => r.district)).size} Districts
            </div>
            <span className="metric-sub">Across Kerala state</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="route-controls-bar">
        <div className="route-search-input-wrap">
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="route-search-input"
            placeholder="Search by Route Name, Code, District..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Branch Filter: Dropdown for Admin, Read-Only Badge for Sub-Branch users */}
          {isAdmin ? (
            <select
              className="route-filter-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f0fdf4',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontWeight: 600,
              fontSize: '12.5px'
            }}>
              <Building2 size={14} color="#16a34a" />
              <span>Assigned Branch: {getBranchDisplayName(userBranchId, currentUser?.branch_name)}</span>
              <span style={{ fontSize: '11px', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>
                🔒 Read-Only
              </span>
            </div>
          )}

          <select
            className="route-filter-select"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            <option value="all">All Districts</option>
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="route-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button
            type="button"
            className="btn-primary-add"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add New Route</span>
          </button>
        </div>
      </div>

      {/* Routes Table Card */}
      <div className="route-table-card">
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
            Loading routes and beats...
          </div>
        ) : routes.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Compass size={48} style={{ color: '#94a3b8', margin: '0 auto 14px' }} />
            <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Routes Registered Yet</h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13.5px' }}>
              Create your delivery routes and beat areas to map sales executives and vans.
            </p>
            <button
              type="button"
              className="btn-primary-add"
              onClick={handleOpenAddModal}
            >
              <Plus size={16} />
              <span>Create First Route</span>
            </button>
          </div>
        ) : (
          <table className="route-table">
            <thead>
              <tr>
                <th>Route Code</th>
                <th>Route / Beat Name</th>
                <th>Branch</th>
                <th>District & State</th>
                <th>Assigned Local Areas / Stops</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => {
                let areas = [];
                try {
                  areas = Array.isArray(r.local_areas) ? r.local_areas : JSON.parse(r.local_areas || '[]');
                } catch {
                  areas = [];
                }
                const assignedBranchName = getBranchDisplayName(r.branch_id, r.branch_name);

                return (
                  <tr key={r.route_id}>
                    <td>
                      <span className="route-code-pill">{r.route_code}</span>
                    </td>
                    <td>
                      <div className="route-name-title">{r.route_name}</div>
                      {r.description && <div className="route-desc-sub" title={r.description}>{r.description}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={14} color="#0284c7" />
                        <span style={{
                          fontWeight: 600,
                          color: '#0369a1',
                          backgroundColor: '#f0f9ff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          border: '1px solid #bae6fd'
                        }}>
                          {assignedBranchName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} color="#64748b" />
                        <strong style={{ color: '#0f172a' }}>{r.district}</strong>
                        <span style={{ color: '#94a3b8' }}>({r.state || 'Kerala'})</span>
                      </div>
                    </td>
                    <td>
                      <div className="route-areas-wrap">
                        {areas.slice(0, 4).map((a, idx) => (
                          <span key={idx} className="area-chip-tag">{a}</span>
                        ))}
                        {areas.length > 4 && (
                          <span className="area-chip-more">+{areas.length - 4} more</span>
                        )}
                        {areas.length === 0 && (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>No specific areas mapped</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${r.status === 'Active' ? 'paid' : 'unpaid'}`}>
                        {r.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="icon-action-btn"
                          title="View Route Details"
                          style={{ color: '#0284c7' }}
                          onClick={(e) => handleOpenViewModal(r, e)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="icon-action-btn"
                          title="Edit Route"
                          onClick={(e) => handleOpenEditModal(r, e)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="icon-action-btn delete"
                          title="Delete Route"
                          onClick={(e) => handleDeleteRoute(r, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Route Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRoute ? 'Edit Route Beat' : 'Create New Route Beat'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoute}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Route Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. RT-001 (Auto generated if blank)"
                      value={formData.route_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, route_code: e.target.value.toUpperCase() }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>District *</label>
                    <select
                      className="form-select"
                      required
                      value={formData.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                    >
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assigned Branch Field: Selectable for Admin, Locked for Sub-branch users */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Assigned Branch *</label>
                    {!isAdmin && (
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                        🔒 Auto-Assigned to your Branch
                      </span>
                    )}
                  </div>
                  {isAdmin ? (
                    <select
                      className="form-select"
                      required
                      value={formData.branch_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
                    >
                      <option value="">Select Branch...</option>
                      {branches.map(b => (
                        <option key={b.branch_id} value={b.branch_id}>
                          {b.branch_name} ({b.branch_code || `BR-${b.branch_id}`}) - {b.district || 'Kerala'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#1e293b',
                        fontWeight: 600
                      }}>
                        <Building2 size={16} color="#0284c7" />
                        <span>{getBranchDisplayName(userBranchId, currentUser?.branch_name)}</span>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '11px',
                          background: '#e2e8f0',
                          color: '#475569',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}>
                          🔒 Read-Only
                        </span>
                      </div>
                      <small style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                        Sub-branch users cannot reassign routes to other branches.
                      </small>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Route / Beat Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Kochi Broadway Commercial Beat"
                    value={formData.route_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, route_name: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0 }}>Local Areas & Commercial Hubs in {formData.district} ({formData.local_areas.length} Selected)</label>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      onClick={handleSelectAllDistrictAreas}
                    >
                      {formData.local_areas.length === getLocalAreasForKeralaDistrict(formData.district).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="area-selection-grid">
                    {getLocalAreasForKeralaDistrict(formData.district).map((area) => {
                      const isSelected = formData.local_areas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          className={`area-select-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleArea(area)}
                        >
                          {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                          <span>{area}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Area Input */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '34px', fontSize: '12.5px' }}
                      placeholder="Add another custom local area / town..."
                      value={customAreaInput}
                      onChange={(e) => setCustomAreaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomArea(e); }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
                      onClick={handleAddCustomArea}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description / Beat Notes</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Covers wholesale grain corridor"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Route Details Modal */}
      {viewingRoute && (
        <div className="modal-overlay" onClick={() => setViewingRoute(null)}>
          <div className="modal-content-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={18} color="#2563eb" />
                  <span>Route Beat Details</span>
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  System Code: <strong style={{ color: '#0f172a' }}>{viewingRoute.route_code}</strong>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setViewingRoute(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Route Summary Banner */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{viewingRoute.route_name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
                    <MapPin size={14} color="#64748b" />
                    <span>{viewingRoute.district}, {viewingRoute.state || 'Kerala'}</span>
                  </div>
                </div>
                <span className={`status-pill ${viewingRoute.status === 'Active' ? 'paid' : 'unpaid'}`}>
                  {viewingRoute.status || 'Active'}
                </span>
              </div>

              {/* Branch Assignment Details */}
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7'
                }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0369a1', fontWeight: 700 }}>
                    Assigned Operating Branch
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0c4a6e' }}>
                    {getBranchDisplayName(viewingRoute.branch_id, viewingRoute.branch_name)}
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingRoute.description && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Description & Beat Notes
                  </label>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {viewingRoute.description}
                  </p>
                </div>
              )}

              {/* Assigned Local Areas */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Assigned Stops & Commercial Areas ({(() => {
                    try {
                      const a = Array.isArray(viewingRoute.local_areas) ? viewingRoute.local_areas : JSON.parse(viewingRoute.local_areas || '[]');
                      return a.length;
                    } catch { return 0; }
                  })()})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto', padding: '2px' }}>
                  {(() => {
                    let areas = [];
                    try {
                      areas = Array.isArray(viewingRoute.local_areas) ? viewingRoute.local_areas : JSON.parse(viewingRoute.local_areas || '[]');
                    } catch { areas = []; }

                    return areas.length > 0 ? (
                      areas.map((a, i) => (
                        <span key={i} className="area-chip-tag" style={{ fontSize: '12px', padding: '4px 10px' }}>
                          {a}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>No specific areas mapped to this route.</span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewingRoute(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const target = viewingRoute;
                  setViewingRoute(null);
                  handleOpenEditModal(target);
                }}
              >
                <Edit2 size={14} style={{ marginRight: '6px' }} />
                <span>Edit Route</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteManagement;
