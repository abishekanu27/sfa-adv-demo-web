import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  Search, 
  RefreshCw, 
  MapPin, 
  BatteryCharging, 
  Gauge, 
  Phone, 
  Truck, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Store,
  Layers,
  Zap,
  Coffee,
  AlertTriangle
} from 'lucide-react';
import { fetchSalesmanLiveTrackingApi } from '../../services/api';
import './SalesmanLiveTrack.css';

export const SalesmanLiveTrack = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const loadTrackingData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await fetchSalesmanLiveTrackingApi();
      setSalesmen(data || []);
      setLastSyncTime(new Date());
      if (data && data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0]);
      } else if (selectedAgent && data) {
        const updated = data.find(s => s.salesman_id === selectedAgent.salesman_id);
        if (updated) setSelectedAgent(updated);
      }
    } catch (err) {
      console.error('Error fetching salesman live tracking:', err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrackingData();
  }, []);

  // Auto-refresh interval every 12 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadTrackingData(false);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filters
  const filteredSalesmen = salesmen.filter(s => {
    const matchesSearch = !searchQuery || 
      s.salesman_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vehicle_reg_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.current_location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDistrict = selectedDistrict === 'All' || s.district === selectedDistrict;
    return matchesSearch && matchesDistrict;
  });

  // Calculate Metrics
  const totalActive = salesmen.length;
  const inVisit = salesmen.filter(s => s.current_status === 'In Shop Visit').length;
  const inTransit = salesmen.filter(s => s.current_status?.includes('Transit') || s.current_status?.includes('Route')).length;
  const totalSalesPunched = salesmen.reduce((sum, s) => sum + (parseFloat(s.today_sales_punched) || 0), 0);

  // Initialize Leaflet Map (Free OpenStreetMap)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.0276, 76.3016], // Centered around Ernakulam / Central Kerala
        zoom: 9,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Leaflet markers when salesmen or selectedAgent changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    filteredSalesmen.forEach((s) => {
      if (!s.coordinates?.lat || !s.coordinates?.lng) return;
      const lat = s.coordinates.lat;
      const lng = s.coordinates.lng;
      const isSelected = selectedAgent?.salesman_id === s.salesman_id;
      const color = s.current_status === 'In Shop Visit' ? '#059669' : s.current_status === 'Lunch Break' ? '#d97706' : '#2563eb';

      const customHtml = `
        <div class="osm-truck-marker ${isSelected ? 'selected' : ''}" style="--marker-color: ${color};">
          <div class="osm-truck-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          <div class="osm-truck-badge">${s.salesman_name.split(' ')[0]} (${s.speed_kmh || 0}km/h)</div>
        </div>
      `;

      const icon = L.divIcon({
        html: customHtml,
        className: 'osm-custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(markersGroup);

      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; min-width: 190px;">
          <h4 style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${s.salesman_name}</h4>
          <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 6px;">
            ${s.vehicle_reg_no || 'Van'} • ${s.route_name || s.district || 'Kerala Beat'}
          </span>
          <div style="font-size: 12px; margin-bottom: 3px;">
            <strong>Status:</strong> <span style="color: ${color}; font-weight: 600;">${s.current_status || 'Active'}</span>
          </div>
          <div style="font-size: 12px; margin-bottom: 3px;">
            <strong>Speed:</strong> ${s.speed_kmh || 0} km/h
          </div>
          <div style="font-size: 12px; margin-bottom: 3px;">
            <strong>Location:</strong> ${s.current_location || 'On Beat'}
          </div>
          <div style="font-size: 12px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; color: #059669; font-weight: 700;">
            Today's Sales: ₹${Number(s.today_sales_punched || 0).toLocaleString('en-IN')}
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedAgent(s);
      });

      if (isSelected) {
        marker.openPopup();
      }
    });
  }, [filteredSalesmen, selectedAgent]);

  // Center & zoom map to selected salesman
  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    if (mapInstanceRef.current && agent.coordinates) {
      mapInstanceRef.current.flyTo([agent.coordinates.lat, agent.coordinates.lng], 14, {
        animate: true,
        duration: 1.2
      });
    }
  };

  return (
    <div className="live-track-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Sales Management</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Salesman Live Track</span>
          </nav>
          <h1 className="dashboard-main-title">
            Field Force GPS Telemetry &amp; Live Tracking
          </h1>
          <p className="dashboard-sub-title">
            Real-time GPS coordinates, vehicle battery telemetry, route deviations, and live merchant shop visits across all Kerala delivery vans.
          </p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
            />
            <span>Auto-refresh (12s)</span>
          </label>

          <button 
            className="action-btn btn-outline"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 14px', 
              background: '#ffffff', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
            onClick={() => loadTrackingData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync GPS Radar'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="live-track-metrics-grid">
        <div className="live-metric-card">
          <div className="metric-icon-wrap blue">
            <Navigation size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Active Field Executives</span>
            <span className="metric-val">{totalActive} Reps On Beat</span>
            <span className="metric-sub">Pinging GPS satellite telemetry</span>
          </div>
        </div>

        <div className="live-metric-card">
          <div className="metric-icon-wrap green">
            <Store size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">In Merchant Store Visits</span>
            <span className="metric-val" style={{ color: '#059669' }}>{inVisit} Salesmen</span>
            <span className="metric-sub">Punched retail check-in</span>
          </div>
        </div>

        <div className="live-metric-card">
          <div className="metric-icon-wrap indigo">
            <Truck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">In Transit / On Route</span>
            <span className="metric-val" style={{ color: '#4f46e5' }}>{inTransit} Vans Moving</span>
            <span className="metric-sub">Cruising between shop beats</span>
          </div>
        </div>

        <div className="live-metric-card">
          <div className="metric-icon-wrap amber">
            <DollarSign size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Today's Sales Punched</span>
            <span className="metric-val" style={{ color: '#d97706' }}>₹{totalSalesPunched.toLocaleString('en-IN')}</span>
            <span className="metric-sub">Live mobile app invoice bookings</span>
          </div>
        </div>
      </div>

      {/* Workspace Dual Panel */}
      <div className="live-track-workspace">
        {/* Left Column: Salesmen List */}
        <div className="salesmen-cards-column">
          {/* Filter and Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
            <div className="search-box-wrap" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }}>
              <Search size={14} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search salesman, van, or beat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['All', 'Ernakulam', 'Kozhikode', 'Thrissur'].map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDistrict(d)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: selectedDistrict === d ? '#2563eb' : '#e2e8f0',
                    background: selectedDistrict === d ? '#eff6ff' : '#ffffff',
                    color: selectedDistrict === d ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {filteredSalesmen.map((s, idx) => {
            const isSelected = selectedAgent?.salesman_id === s.salesman_id;
            const statusBadgeType = s.current_status === 'In Shop Visit' ? 'visit' : s.current_status === 'Lunch Break' ? 'break' : 'transit';
            const progressPct = s.stops_target ? Math.round(((s.stops_completed || 0) / s.stops_target) * 100) : 50;

            return (
              <div 
                key={s.salesman_id || idx}
                className={`salesman-radar-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectAgent(s)}
              >
                <div className="card-top-row">
                  <div className="salesman-info-head">
                    <h4>{s.salesman_name}</h4>
                    <span className="salesman-vehicle-tag">
                      <Truck size={12} color="#64748b" />
                      {s.vehicle_reg_no || 'KL-Van-Unassigned'} • {s.route_name || s.district || 'Central Beat'}
                    </span>
                  </div>

                  <span className={`live-pulse-badge ${statusBadgeType}`}>
                    <span className="live-dot"></span>
                    {s.current_status || 'Active'}
                  </span>
                </div>

                <div className="card-location-snippet">
                  <MapPin size={13} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.current_location || 'On Route'}
                  </span>
                </div>

                {/* Progress */}
                <div className="progress-section">
                  <div className="progress-header">
                    <span>Beat Progress: <strong>{s.stops_completed || 0}/{s.stops_target || 15} Shops</strong></span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
                  </div>
                </div>

                {/* Telemetry Strip */}
                <div className="card-telemetry-strip">
                  <div className="telemetry-item">
                    <span className="telemetry-lbl">Speed</span>
                    <span className="telemetry-val" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Gauge size={12} color="#64748b" />
                      {s.speed_kmh || 0} km/h
                    </span>
                  </div>

                  <div className="telemetry-item">
                    <span className="telemetry-lbl">Device Battery</span>
                    <span className="telemetry-val" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <BatteryCharging size={12} color={s.battery_pct > 30 ? '#059669' : '#dc2626'} />
                      {s.battery_pct || 80}%
                    </span>
                  </div>

                  <div className="telemetry-item">
                    <span className="telemetry-lbl">Today's Sales</span>
                    <span className="telemetry-val" style={{ color: '#059669' }}>
                      ₹{Number(s.today_sales_punched || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: OpenStreetMap Visualizer & Detail Drawer */}
        <div className="map-visualizer-container">
          <div className="map-top-bar">
            <div>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Live GPS Tracking</strong>
              <p style={{ margin: '1px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Last pinged: {lastSyncTime.toLocaleTimeString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#059669', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></span>
                In Store
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#2563eb', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }}></span>
                In Transit
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#d97706', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }}></span>
                Break
              </span>
            </div>
          </div>

          {/* Real Leaflet OpenStreetMap Canvas */}
          <div ref={mapContainerRef} className="osm-map-container" />

          {/* Bottom Telemetry Drawer of Selected Salesman */}
          {selectedAgent && (
            <div className="selected-agent-drawer">
              <div className="drawer-header-row">
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedAgent.salesman_name}
                    <span style={{ fontSize: '12px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {selectedAgent.vehicle_reg_no}
                    </span>
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                    <strong>Current Activity:</strong> {selectedAgent.activity || selectedAgent.current_location}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href={`tel:${selectedAgent.salesman_phone || '9847000000'}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      background: '#059669',
                      color: '#ffffff',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '12.5px',
                      fontWeight: 600
                    }}
                  >
                    <Phone size={14} />
                    <span>Call Sales Rep</span>
                  </a>
                </div>
              </div>

              <div className="agent-kpis-grid">
                <div className="agent-kpi-box">
                  <span className="lbl">Vehicle Speed</span>
                  <span className="val" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gauge size={16} color="#64748b" />
                    {selectedAgent.speed_kmh || 0} km/h
                  </span>
                </div>
                <div className="agent-kpi-box">
                  <span className="lbl">Device Battery</span>
                  <span className="val" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (selectedAgent.battery_pct || 80) > 30 ? '#059669' : '#dc2626' }}>
                    <BatteryCharging size={16} />
                    {selectedAgent.battery_pct != null ? selectedAgent.battery_pct : 85}%
                  </span>
                </div>
                <div className="agent-kpi-box">
                  <span className="lbl">Today's Sales</span>
                  <span className="val" style={{ color: '#059669', fontWeight: 800 }}>
                    ₹{Number(selectedAgent.today_sales_punched || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="agent-kpi-box">
                  <span className="lbl">Cash Collected</span>
                  <span className="val" style={{ color: '#059669' }}>
                    ₹{Number(selectedAgent.today_collections_cash || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="agent-kpi-box">
                  <span className="lbl">UPI Collections</span>
                  <span className="val" style={{ color: '#2563eb' }}>
                    ₹{Number(selectedAgent.today_collections_upi || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="agent-kpi-box">
                  <span className="lbl">GPS Satellite Ping</span>
                  <span className="val" style={{ fontSize: '12.5px', color: '#0f172a' }}>
                    {selectedAgent.last_ping || 'Active GPS'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
