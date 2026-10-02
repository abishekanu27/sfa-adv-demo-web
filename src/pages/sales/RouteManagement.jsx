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
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  fetchRoutesApi,
  createRouteApi,
  updateRouteApi,
  deleteRouteApi
} from '../../services/api';
import { KERALA_DISTRICTS, getLocalAreasForKeralaDistrict } from '../../data/locationData';
import './RouteManagement.css';

export const RouteManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [metrics, setMetrics] = useState({
    total_routes: 0,
    active_routes: 0,
    districts_covered: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
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
    status: 'Active'
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const res = await fetchRoutesApi({
        search: searchQuery,
        district: districtFilter,
        status: statusFilter
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
  }, [searchQuery, districtFilter, statusFilter]);

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

    setFormData({
      route_code: nextCode,
      route_name: '',
      district: initialDistrict,
      state: 'Kerala',
      local_areas: defaultAreas,
      description: '',
      status: 'Active'
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

    setFormData({
      route_code: r.route_code || '',
      route_name: r.route_name || '',
      district: r.district || 'Ernakulam',
      state: r.state || 'Kerala',
      local_areas: parsedAreas,
      description: r.description || '',
      status: r.status || 'Active'
    });
    setCustomAreaInput('');
    setShowModal(true);
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
    </div>
  );
};

export default RouteManagement;
