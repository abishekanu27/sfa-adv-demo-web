import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  User,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Compass,
  CheckSquare,
  Square,
  Navigation
} from 'lucide-react';
import { KERALA_DISTRICTS, getLocalAreasForKeralaDistrict } from '../../data/locationData';
import './SalesmanRouteMapping.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SalesmanRouteMapping = ({ onNavigateToRoutes }) => {
  const [mappings, setMappings] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    salesman_id: '',
    vehicle_id: '',
    state: 'Kerala',
    district: 'Ernakulam',
    local_areas: [],
    route_name: '',
    schedule_days: ['Monday', 'Wednesday', 'Friday'],
    status: 'Active',
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [mapRes, smRes, vehRes, routeRes] = await Promise.all([
        fetch(`${API_BASE}/sales/mappings`),
        fetch(`${API_BASE}/sales/salesmen`),
        fetch(`${API_BASE}/sales/vehicles`),
        fetch(`${API_BASE}/sales/routes`).catch(() => ({ json: () => ({ success: false }) }))
      ]);

      const mapData = await mapRes.json();
      const smData = await smRes.json();
      const vehData = await vehRes.json();
      const routeData = await routeRes.json();

      if (mapData.success) setMappings(mapData.mappings || []);
      if (smData.success) setSalesmen(smData.salesmen || []);
      if (vehData.success) setVehicles(vehData.vehicles || []);
      if (routeData.success) setAvailableRoutes(routeData.routes || []);
    } catch (err) {
      console.error('Error loading route mappings:', err);
      showNotification('Failed to load salesman route mappings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingMapping(null);
    const initialDistrict = 'Ernakulam';
    const areas = getLocalAreasForKeralaDistrict(initialDistrict);
    const defaultSelectedAreas = areas.slice(0, 3);

    setFormData({
      salesman_id: salesmen[0]?.id || '',
      vehicle_id: vehicles[0]?.vehicle_id || '',
      state: 'Kerala',
      district: initialDistrict,
      local_areas: defaultSelectedAreas,
      route_name: `${initialDistrict} Central & Commercial Beat`,
      schedule_days: ['Monday', 'Wednesday', 'Friday'],
      status: 'Active',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (m, e) => {
    if (e) e.stopPropagation();
    setEditingMapping(m);
    
    let parsedAreas = [];
    try {
      parsedAreas = Array.isArray(m.local_areas) ? m.local_areas : JSON.parse(m.local_areas || '[]');
    } catch {
      parsedAreas = [];
    }

    let parsedDays = [];
    try {
      parsedDays = Array.isArray(m.schedule_days) ? m.schedule_days : JSON.parse(m.schedule_days || '[]');
    } catch {
      parsedDays = ['Monday', 'Wednesday', 'Friday'];
    }

    setFormData({
      mapping_id: m.mapping_id,
      salesman_id: m.salesman_id || '',
      vehicle_id: m.vehicle_id || '',
      state: m.state || 'Kerala',
      district: m.district || 'Ernakulam',
      local_areas: parsedAreas,
      route_name: m.route_name || '',
      schedule_days: parsedDays,
      status: m.status || 'Active',
      notes: m.notes || ''
    });
    setShowModal(true);
  };

  const handleDistrictChange = (dist) => {
    const areas = getLocalAreasForKeralaDistrict(dist);
    const autoAreas = areas.slice(0, 2);
    setFormData(prev => ({
      ...prev,
      district: dist,
      local_areas: autoAreas,
      route_name: `${dist} Beat (${autoAreas.join(', ') || 'Territory'})`
    }));
  };

  const handleToggleLocalArea = (area) => {
    setFormData(prev => {
      const exists = prev.local_areas.includes(area);
      const updated = exists
        ? prev.local_areas.filter(a => a !== area)
        : [...prev.local_areas, area];
      return {
        ...prev,
        local_areas: updated,
        route_name: `${prev.district} Beat (${updated.slice(0, 2).join(', ') || 'Custom'})`
      };
    });
  };

  const handleSelectAllDistrictAreas = () => {
    const allAreas = getLocalAreasForKeralaDistrict(formData.district);
    setFormData(prev => ({
      ...prev,
      local_areas: prev.local_areas.length === allAreas.length ? [] : allAreas
    }));
  };

  const handleToggleDay = (day) => {
    setFormData(prev => {
      const exists = prev.schedule_days.includes(day);
      const updated = exists
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day];
      return { ...prev, schedule_days: updated };
    });
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!formData.salesman_id) {
      showNotification('Please select a sales executive', 'error');
      return;
    }
    if (!formData.district) {
      showNotification('Please select a Kerala district', 'error');
      return;
    }
    if (formData.local_areas.length === 0) {
      showNotification('Please select at least one local area / commercial beat', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/sales/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Salesman & Route Mapping saved!');
        setShowModal(false);
        setEditingMapping(null);
        await loadData();
      } else {
        showNotification(data.message || 'Failed to save mapping', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMapping = async (mappingId, smName, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Delete route territory mapping for ${smName}?`)) {
      try {
        const res = await fetch(`${API_BASE}/sales/mappings/${mappingId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showNotification(`Mapping removed for ${smName}`);
          await loadData();
        }
      } catch (err) {
        showNotification('Failed to delete mapping', 'error');
      }
    }
  };

  // Filter mappings
  const filteredMappings = mappings.filter((m) => {
    let areasStr = '';
    try {
      areasStr = (Array.isArray(m.local_areas) ? m.local_areas.join(' ') : m.local_areas || '');
    } catch {
      areasStr = '';
    }

    const matchesSearch = 
      (m.salesman_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.vehicle_reg_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.district || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.route_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      areasStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDistrict = districtFilter === 'all' || m.district === districtFilter;
    return matchesSearch && matchesDistrict;
  });

  const availableAreasForDistrict = getLocalAreasForKeralaDistrict(formData.district);

  return (
    <div className="salesman-mapping-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`sales-mapping-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Sales</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Salesman & Vehicle Mapping</span>
          </nav>
          <h1 className="dashboard-main-title">Salesman & Route Mapping</h1>
          <p className="dashboard-sub-title">
            Map Sales Executives to delivery vehicles and route territories by selecting Kerala Districts and local commercial beats.
          </p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onNavigateToRoutes && (
            <button 
              type="button" 
              className="action-btn" 
              onClick={onNavigateToRoutes}
              style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
            >
              <Navigation size={15} />
              <span>Route Master (+ Add Route)</span>
            </button>
          )}
          <button className="action-btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={15} />
            <span>Map Salesman to Vehicle & Route</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mapping-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Salesman, Vehicle, Kerala District, Beat / Town..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="district-filter-select-wrap">
          <label className="filter-tag-label">Kerala District:</label>
          <select 
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="filter-district-select"
          >
            <option value="all">All 14 Districts ({mappings.length})</option>
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mappings Table Card */}
      <div className="mapping-table-card">
        <div className="table-responsive-wrapper">
          <table className="customers-data-table route-mapping-table">
            <thead>
              <tr>
                <th style={{ minWidth: '170px' }}>Sales Executive</th>
                <th style={{ minWidth: '170px' }}>Assigned Vehicle</th>
                <th style={{ minWidth: '130px' }}>Territory / District</th>
                <th style={{ minWidth: '240px' }}>Mapped Local Areas / Beats</th>
                <th style={{ minWidth: '140px' }}>Beat Schedule</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-table-cell">
                    Loading territory mappings...
                  </td>
                </tr>
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-table-cell">
                    <div className="empty-state-box">
                      <Compass size={38} className="empty-icon" />
                      <h4>No Salesman & Route Mappings Found</h4>
                      <p>No active salesman-vehicle-route mappings match your filter criteria.</p>
                      <button className="action-btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '12px' }}>
                        <Plus size={14} />
                        <span>Create First Mapping</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m) => {
                  let areas = [];
                  try {
                    areas = Array.isArray(m.local_areas) ? m.local_areas : JSON.parse(m.local_areas || '[]');
                  } catch {
                    areas = [];
                  }

                  let days = [];
                  try {
                    days = Array.isArray(m.schedule_days) ? m.schedule_days : JSON.parse(m.schedule_days || '[]');
                  } catch {
                    days = [];
                  }

                  return (
                    <tr key={m.mapping_id}>
                      <td className="salesman-cell">
                        <div className="salesman-cell-inner">
                          <div className="salesman-name-row">
                            <User size={13} className="text-blue-600" />
                            <strong>{m.salesman_name}</strong>
                          </div>
                          {m.salesman_phone && (
                            <div className="meta-line">
                              <Phone size={11} />
                              <span>{m.salesman_phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="vehicle-cell">
                        <div className="vehicle-cell-inner">
                          {m.vehicle_reg_no ? (
                            <>
                              <div className="reg-badge-mini">
                                <span className="mini-ind">IND</span>
                                <span className="mini-reg">{m.vehicle_reg_no}</span>
                              </div>
                              <small className="vehicle-model-sub">{m.vehicle_model || 'Delivery Van'}</small>
                            </>
                          ) : (
                            <span className="text-muted">No Vehicle Assigned</span>
                          )}
                        </div>
                      </td>

                      <td className="district-cell">
                        <div className="district-cell-inner">
                          <span className="district-badge">{m.district}, Kerala</span>
                          {m.route_name && (
                            <small className="route-title-sub">{m.route_name}</small>
                          )}
                        </div>
                      </td>

                      <td className="areas-cell">
                        <div className="areas-pill-cluster">
                          {areas.map((a, i) => (
                            <span key={i} className="area-beat-pill" title={a}>
                              <MapPin size={10} />
                              <span>{a}</span>
                            </span>
                          ))}
                          {areas.length === 0 && <span className="text-muted">—</span>}
                        </div>
                      </td>

                      <td className="schedule-cell">
                        <div className="days-chip-wrap">
                          {days.map((d) => (
                            <span key={d} className="day-chip">
                              {d.slice(0, 3)}
                            </span>
                          ))}
                          {days.length === 0 && <span className="text-muted">Daily</span>}
                        </div>
                      </td>

                      <td className="status-cell text-center">
                        <span className={`status-pill ${m.status === 'Active' ? 'in-stock' : 'out-stock'}`}>
                          {m.status || 'Active'}
                        </span>
                      </td>

                      <td className="actions-cell text-center">
                        <div className="customer-actions-inner">
                          <button
                            type="button"
                            className="table-icon-action edit"
                            title="Edit Route Mapping"
                            onClick={(e) => handleOpenEditModal(m, e)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-action delete"
                            title="Delete Route Mapping"
                            onClick={(e) => handleDeleteMapping(m.mapping_id, m.salesman_name, e)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Map Salesman to Vehicle & Route */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-dialog route-mapping-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>{editingMapping ? `Edit Route Mapping: ${formData.salesman_id}` : 'Map Salesman & Vehicle to Route'}</h3>
                <span className="modal-sub-tag">Assign vehicle & configure Kerala district beats</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="modal-form">
              <div className="modal-scrollable-body">
                {/* 1. Salesman & Vehicle Selection */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Select Sales Executive *</label>
                    <select
                      className="modal-select"
                      value={formData.salesman_id}
                      onChange={(e) => setFormData({ ...formData, salesman_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Sales Executive --</option>
                      {salesmen.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.phone || s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assign Delivery Vehicle</label>
                    <select
                      className="modal-select"
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    >
                      <option value="">-- Select Fleet Vehicle --</option>
                      {vehicles.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.registration_no} - {v.model_name || v.vehicle_type} ({v.capacity_desc || `${v.capacity_ton}T`})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Route Mapping Section: Select District */}
                <div className="route-territory-builder-box">
                  <div className="box-header-row">
                    <Navigation size={16} className="text-blue-600" />
                    <strong>Route Territory Mapping</strong>
                  </div>
                  <p className="box-desc">
                    Choose an existing Route from Route Master or select a Kerala District and specific beats.
                  </p>

                  {/* Optional Quick Route Selection */}
                  {availableRoutes.length > 0 && (
                    <div className="form-group" style={{ marginBottom: '14px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#1e40af' }}>
                          ⚡ Quick-Fill from Route Master:
                        </label>
                        {onNavigateToRoutes && (
                          <button
                            type="button"
                            onClick={() => { setShowModal(false); onNavigateToRoutes(); }}
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            + Manage Routes
                          </button>
                        )}
                      </div>
                      <select
                        className="modal-select"
                        defaultValue=""
                        onChange={(e) => {
                          const routeId = e.target.value;
                          const r = availableRoutes.find(item => String(item.route_id) === String(routeId));
                          if (r) {
                            let parsed = [];
                            try {
                              parsed = Array.isArray(r.local_areas) ? r.local_areas : JSON.parse(r.local_areas || '[]');
                            } catch {
                              parsed = [];
                            }
                            setFormData(prev => ({
                              ...prev,
                              district: r.district || prev.district,
                              local_areas: parsed.length > 0 ? parsed : prev.local_areas,
                              route_name: r.route_name || prev.route_name
                            }));
                          }
                        }}
                      >
                        <option value="">-- Choose Route from Master (Auto-fills below) --</option>
                        {availableRoutes.map(r => (
                          <option key={r.route_id} value={r.route_id}>
                            {r.route_code}: {r.route_name} ({r.district})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>1. Select Kerala District *</label>
                    <select
                      className="modal-select district-select"
                      value={formData.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      required
                    >
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          District: {d} (Kerala)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cascading Local Areas Selector */}
                  <div className="local-areas-selector-wrap">
                    <div className="areas-header-bar">
                      <label className="section-label">
                        2. Select Local Areas / Commercial Beats in <strong>{formData.district}</strong> ({formData.local_areas.length} selected)
                      </label>
                      <button
                        type="button"
                        className="inline-toggle-btn"
                        onClick={handleSelectAllDistrictAreas}
                      >
                        {formData.local_areas.length === availableAreasForDistrict.length
                          ? 'Deselect All'
                          : 'Select All Beats'}
                      </button>
                    </div>

                    <div className="areas-checkbox-grid">
                      {availableAreasForDistrict.map((area) => {
                        const isChecked = formData.local_areas.includes(area);
                        return (
                          <div
                            key={area}
                            className={`area-checkbox-card ${isChecked ? 'selected' : ''}`}
                            onClick={() => handleToggleLocalArea(area)}
                          >
                            <span className="checkbox-icon">
                              {isChecked ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-slate-400" />}
                            </span>
                            <span className="area-card-text">{area}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Route Name */}
                <div className="form-group">
                  <label>Route Display Name / Description</label>
                  <input
                    type="text"
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    placeholder="e.g. Ernakulam Central Wholesale & FMCG Beat"
                  />
                </div>

                {/* 4. Schedule Days & Status */}
                <div className="form-group">
                  <label>Scheduled Delivery Days</label>
                  <div className="days-picker-group">
                    {WEEK_DAYS.map((day) => {
                      const isSelected = formData.schedule_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`day-picker-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => handleToggleDay(day)}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Mapping Status</label>
                    <select
                      className="modal-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active Route</option>
                      <option value="Inactive">Inactive / Suspended</option>
                      <option value="On Leave">Salesman on Leave</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Internal Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Key focus on wholesale grocery accounts"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn btn-primary" disabled={isSubmitting}>
                  <CheckSquare size={14} />
                  <span>{isSubmitting ? 'Saving...' : editingMapping ? 'Update Route Mapping' : 'Save Route Mapping'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
