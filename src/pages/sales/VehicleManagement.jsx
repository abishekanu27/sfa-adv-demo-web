import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Fuel,
  Weight,
  Wrench,
  Compass,
  CheckSquare
} from 'lucide-react';
import './VehicleManagement.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [metrics, setMetrics] = useState({
    total_vehicles: 0,
    on_route_count: 0,
    available_count: 0,
    maintenance_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    registration_no: '',
    vehicle_type: 'Van',
    model_name: '',
    capacity_ton: '1.2',
    capacity_desc: '',
    fuel_type: 'Diesel',
    driver_name: '',
    driver_phone: '',
    insurance_expiry: '',
    status: 'Available',
    notes: ''
  });

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/sales/vehicles`);
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      showNotification('Failed to load fleet vehicles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      registration_no: '',
      vehicle_type: 'Van',
      model_name: '',
      capacity_ton: '1.2',
      capacity_desc: '',
      fuel_type: 'Diesel',
      driver_name: '',
      driver_phone: '',
      insurance_expiry: '',
      status: 'Available',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (v, e) => {
    if (e) e.stopPropagation();
    setEditingVehicle(v);
    setFormData({
      registration_no: v.registration_no || '',
      vehicle_type: v.vehicle_type || 'Van',
      model_name: v.model_name || '',
      capacity_ton: v.capacity_ton || '1.0',
      capacity_desc: v.capacity_desc || '',
      fuel_type: v.fuel_type || 'Diesel',
      driver_name: v.driver_name || '',
      driver_phone: v.driver_phone || '',
      insurance_expiry: v.insurance_expiry ? v.insurance_expiry.split('T')[0] : '',
      status: v.status || 'Available',
      notes: v.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!formData.registration_no.trim()) {
      showNotification('Vehicle Registration Number is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingVehicle 
        ? `${API_BASE}/sales/vehicles/${editingVehicle.vehicle_id}` 
        : `${API_BASE}/sales/vehicles`;
      const method = editingVehicle ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Vehicle saved successfully!');
        setShowModal(false);
        setEditingVehicle(null);
        await loadVehicles();
      } else {
        showNotification(data.message || 'Failed to save vehicle', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Server error saving vehicle', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId, regNo, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove vehicle ${regNo}?`)) {
      try {
        const res = await fetch(`${API_BASE}/sales/vehicles/${vehicleId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showNotification(`Vehicle ${regNo} removed`);
          await loadVehicles();
        } else {
          showNotification(data.message || 'Failed to delete vehicle', 'error');
        }
      } catch (err) {
        showNotification('Server error deleting vehicle', 'error');
      }
    }
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = 
      (v.registration_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.model_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.driver_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.vehicle_code || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'route' && (v.status || '').toLowerCase().includes('route')) ||
      (statusFilter === 'available' && (v.status || '').toLowerCase() === 'available') ||
      (statusFilter === 'maintenance' && (v.status || '').toLowerCase().includes('maintenance'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="vehicle-management-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`veh-toast ${toast.type}`}>
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
            <span className="breadcrumb-active">Vehicle Adding</span>
          </nav>
          <h1 className="dashboard-main-title">Vehicle Fleet Catalog</h1>
          <p className="dashboard-sub-title">
            Delivery vans, mini-trucks, load carriers, carrying capacities, assigned drivers, and operational fleet readiness.
          </p>
        </div>

        <div className="header-actions">
          <button className="action-btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={15} />
            <span>Add New Vehicle</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="vehicle-metrics-grid">
        <div className="vehicle-metric-card">
          <div className="metric-icon-wrap blue">
            <Truck size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Fleet</span>
            <span className="metric-val">{metrics.total_vehicles} Vehicles</span>
            <span className="metric-sub">Registered logistics fleet</span>
          </div>
        </div>

        <div className="vehicle-metric-card">
          <div className="metric-icon-wrap green">
            <Compass size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Active on Route</span>
            <span className="metric-val green-text">{metrics.on_route_count} On Beat</span>
            <span className="metric-sub">Executing customer delivery runs</span>
          </div>
        </div>

        <div className="vehicle-metric-card">
          <div className="metric-icon-wrap purple">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Available / Idle</span>
            <span className="metric-val purple-text">{metrics.available_count} Standby</span>
            <span className="metric-sub">Ready for loading and dispatch</span>
          </div>
        </div>

        <div className="vehicle-metric-card">
          <div className="metric-icon-wrap amber">
            <Wrench size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">In Maintenance</span>
            <span className="metric-val amber-text">{metrics.maintenance_count} Workshop</span>
            <span className="metric-sub">Scheduled service or repairs</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="vehicle-controls-bar">
        <div className="search-input-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            placeholder="Search by Reg No, Make/Model, Driver Name, Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="vehicle-status-filters">
          <span className="filter-tag-label">Fleet Status:</span>
          <button
            className={`pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Vehicles ({vehicles.length})
          </button>
          <button
            className={`pill-btn ${statusFilter === 'route' ? 'active' : ''}`}
            onClick={() => setStatusFilter('route')}
          >
            Active on Route ({metrics.on_route_count})
          </button>
          <button
            className={`pill-btn ${statusFilter === 'available' ? 'active' : ''}`}
            onClick={() => setStatusFilter('available')}
          >
            Available ({metrics.available_count})
          </button>
          <button
            className={`pill-btn ${statusFilter === 'maintenance' ? 'active' : ''}`}
            onClick={() => setStatusFilter('maintenance')}
          >
            Maintenance ({metrics.maintenance_count})
          </button>
        </div>
      </div>

      {/* Vehicles Table Card */}
      <div className="vehicle-table-card">
        <div className="table-responsive-wrapper">
          <table className="customers-data-table vehicle-data-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>Code</th>
                <th style={{ minWidth: '150px' }}>Registration No</th>
                <th style={{ minWidth: '170px' }}>Type & Model</th>
                <th style={{ minWidth: '140px' }}>Payload Capacity</th>
                <th style={{ width: '100px' }}>Fuel Type</th>
                <th style={{ minWidth: '160px' }}>Driver & Contact</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-table-cell">
                    Loading vehicles from database...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-table-cell">
                    <div className="empty-state-box">
                      <Truck size={38} className="empty-icon" />
                      <h4>No Vehicles Found</h4>
                      <p>No distribution vehicles match your search or filter criteria.</p>
                      <button className="action-btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '12px' }}>
                        <Plus size={14} />
                        <span>Add First Vehicle</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const isRoute = (v.status || '').toLowerCase().includes('route');
                  const isMaintenance = (v.status || '').toLowerCase().includes('maintenance');

                  return (
                    <tr key={v.vehicle_id}>
                      <td className="code-cell">
                        <span className="veh-code-badge">{v.vehicle_code}</span>
                      </td>

                      <td className="reg-cell">
                        <div className="reg-number-plate">
                          <span className="ind-strip">IND</span>
                          <span className="reg-code">{v.registration_no}</span>
                        </div>
                      </td>

                      <td className="model-cell">
                        <div className="model-cell-inner">
                          <strong>{v.model_name || 'Commercial Vehicle'}</strong>
                          <span className="vehicle-type-tag">{v.vehicle_type}</span>
                        </div>
                      </td>

                      <td className="capacity-cell">
                        <div className="capacity-cell-inner">
                          <span className="capacity-val">{v.capacity_ton} Tons</span>
                          {v.capacity_desc && (
                            <small className="capacity-sub">{v.capacity_desc}</small>
                          )}
                        </div>
                      </td>

                      <td className="fuel-cell">
                        <span className={`fuel-badge ${v.fuel_type?.toLowerCase() || 'diesel'}`}>
                          <Fuel size={11} />
                          <span>{v.fuel_type}</span>
                        </span>
                      </td>

                      <td className="driver-cell">
                        <div className="driver-cell-inner">
                          <strong>{v.driver_name || 'Unassigned Driver'}</strong>
                          {v.driver_phone && (
                            <div className="meta-phone">
                              <Phone size={11} />
                              <span>{v.driver_phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="status-cell text-center">
                        <span className={`vehicle-status-pill ${isRoute ? 'on-route' : isMaintenance ? 'maintenance' : 'available'}`}>
                          {v.status || 'Available'}
                        </span>
                      </td>

                      <td className="actions-cell text-center">
                        <div className="customer-actions-inner">
                          <button
                            type="button"
                            className="table-icon-action edit"
                            title="Edit Vehicle"
                            onClick={(e) => handleOpenEditModal(v, e)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-action delete"
                            title="Delete Vehicle"
                            onClick={(e) => handleDeleteVehicle(v.vehicle_id, v.registration_no, e)}
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

      {/* Modal: Add or Edit Vehicle */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-dialog vehicle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3>{editingVehicle ? `Edit Vehicle: ${editingVehicle.registration_no}` : 'Add New Fleet Vehicle'}</h3>
                <span className="modal-sub-tag">Commercial vehicle registration & capacity details</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="modal-form">
              <div className="modal-scrollable-body">
                {/* 1. Registration & Type */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Registration Number * (e.g. KL-07-CD-4591)</label>
                    <input
                      type="text"
                      required
                      placeholder="KL-07-CD-4591"
                      value={formData.registration_no}
                      onChange={(e) => setFormData({ ...formData, registration_no: e.target.value.toUpperCase() })}
                      style={{ fontFamily: 'monospace', fontWeight: '700', textTransform: 'uppercase' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Vehicle Type *</label>
                    <select
                      className="modal-select"
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      required
                    >
                      <option value="Van">Delivery Van (Closed Body)</option>
                      <option value="Mini-Truck">Mini-Truck (Tata Ace / Dost)</option>
                      <option value="3-Wheeler Auto-Load">3-Wheeler Auto-Load Carrier</option>
                      <option value="Pickup">Pickup Truck (Bolero Maxi Truck)</option>
                      <option value="Medium Truck">Medium Distribution Truck</option>
                    </select>
                  </div>
                </div>

                {/* 2. Model & Fuel */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Make & Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Tata Ace Gold Petrol High-Deck"
                      value={formData.model_name}
                      onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Fuel Type</label>
                    <select
                      className="modal-select"
                      value={formData.fuel_type}
                      onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                      <option value="CNG">CNG</option>
                      <option value="EV">Electric (EV)</option>
                    </select>
                  </div>
                </div>

                {/* 3. Carrying Capacity */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Payload Capacity (Tons)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.capacity_ton}
                      onChange={(e) => setFormData({ ...formData, capacity_ton: e.target.value })}
                      placeholder="e.g. 1.2"
                    />
                  </div>

                  <div className="form-group">
                    <label>Capacity Description (Boxes/Volume)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1.2 Tons / 80 Cartons"
                      value={formData.capacity_desc}
                      onChange={(e) => setFormData({ ...formData, capacity_desc: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. Driver Information */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Assigned Driver Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sujith Kumar"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Driver Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98460 12345"
                      value={formData.driver_phone}
                      onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* 5. Status & Insurance */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Fleet Operational Status</label>
                    <select
                      className="modal-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Available">Available (Standby in Yard)</option>
                      <option value="Active on Route">Active on Route</option>
                      <option value="In Maintenance">In Maintenance / Workshop</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Insurance / Fitness Expiry Date</label>
                    <input
                      type="date"
                      value={formData.insurance_expiry}
                      onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                    />
                  </div>
                </div>

                {/* 6. Notes */}
                <div className="form-group">
                  <label>Vehicle Notes / Assigned Beats</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Fitted with GPS tracker. Preferred for narrow city streets."
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn btn-primary" disabled={isSubmitting}>
                  <CheckSquare size={14} />
                  <span>{isSubmitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
