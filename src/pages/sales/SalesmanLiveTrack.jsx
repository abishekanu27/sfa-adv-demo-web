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
  AlertTriangle,
  Map,
  Eye,
  EyeOff
} from 'lucide-react';
import { fetchSalesmanLiveTrackingApi, fetchCustomersApi } from '../../services/api';
import './SalesmanLiveTrack.css';

export const SalesmanLiveTrack = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustomers, setShowCustomers] = useState(true);
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
  const customerMarkersGroupRef = useRef(null);

  const loadTrackingData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await fetchSalesmanLiveTrackingApi();
      setSalesmen(data || []);
      setLastSyncTime(new Date());

      // Customers from live-tracking or fetchCustomersApi fallback
      if (data && data._customers && data._customers.length > 0) {
        setCustomers(data._customers);
      } else {
        try {
          const cList = await fetchCustomersApi();
          const valid = (cList || []).filter(c => c.latitude && c.longitude).map(c => ({
            ...c,
            latitude: parseFloat(c.latitude),
            longitude: parseFloat(c.longitude),
            outstanding_balance: parseFloat(c.outstanding_balance) || 0
          }));
          setCustomers(valid);
        } catch (cErr) {
          console.warn('Customer fetch fallback notice:', cErr);
        }
      }

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
  const mappedCustomersCount = customers.filter(c => c.latitude && c.longitude).length;

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

      const customerMarkersGroup = L.layerGroup().addTo(map);
      customerMarkersGroupRef.current = customerMarkersGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Leaflet markers when salesmen, customers, or selectedAgent changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !customerMarkersGroupRef.current) return;
    const markersGroup = markersGroupRef.current;
    const customerMarkersGroup = customerMarkersGroupRef.current;

    markersGroup.clearLayers();
    customerMarkersGroup.clearLayers();

    const boundsPoints = [];

    // Render Salesmen Markers
    filteredSalesmen.forEach((s) => {
      if (!s.coordinates?.lat || !s.coordinates?.lng) return;
      const lat = s.coordinates.lat;
      const lng = s.coordinates.lng;
      boundsPoints.push([lat, lng]);

      const isSelected = selectedAgent?.salesman_id === s.salesman_id;
      const isLiveGps = s.is_live_gps !== false;
      const color = s.current_status === 'In Shop Visit' 
        ? '#059669' 
        : s.current_status === 'Lunch Break' 
        ? '#d97706' 
        : isLiveGps ? '#2563eb' : '#64748b';

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
          <div class="osm-truck-badge">${s.salesman_name.split(' ')[0]} (${isLiveGps ? `${s.speed_kmh || 0}km/h` : 'Awaiting Fix'})</div>
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
        <div style="font-family: inherit; padding: 4px; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${s.salesman_name}</h4>
            <span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: ${isLiveGps ? '#dcfce7' : '#f1f5f9'}; color: ${isLiveGps ? '#15803d' : '#64748b'};">
              ${isLiveGps ? 'LIVE GPS' : 'BEAT CENTER'}
            </span>
          </div>
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
          <div style="font-size: 12px; margin-bottom: 3px;">
            <strong>Last Ping:</strong> ${s.last_ping || 'Just now'}
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

    // Render Customer Store Markers
    if (showCustomers && customers && customers.length > 0) {
      customers.forEach((c) => {
        if (!c.latitude || !c.longitude) return;
        boundsPoints.push([c.latitude, c.longitude]);

        const customCustomerHtml = `
          <div class="osm-customer-marker">
            <div class="osm-customer-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div class="osm-customer-badge">${c.name.split(' ')[0]}</div>
          </div>
        `;

        const custIcon = L.divIcon({
          html: customCustomerHtml,
          className: 'osm-custom-div-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const custMarker = L.marker([c.latitude, c.longitude], { icon: custIcon }).addTo(customerMarkersGroup);

        custMarker.bindPopup(`
          <div style="font-family: inherit; padding: 4px; min-width: 200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: #047857; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">CUSTOMER STORE</span>
              <span style="font-size: 10.5px; font-weight: 700; color: #2563eb;">${c.customer_code || ''}</span>
            </div>
            <h4 style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${c.name}</h4>
            <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 6px;">
              ${c.local_area || c.route_area || c.place || 'Commercial Beat'}
            </span>
            ${c.phone ? `<div style="font-size: 12px; margin-bottom: 3px;"><strong>Phone:</strong> ${c.phone}</div>` : ''}
            <div style="font-size: 12px; margin-bottom: 3px;">
              <strong>GPS:</strong> ${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}
            </div>
            <div style="font-size: 12px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; color: ${Number(c.outstanding_balance) > 0 ? '#dc2626' : '#059669'}; font-weight: 700;">
              Outstanding Due: ₹${Number(c.outstanding_balance || 0).toLocaleString('en-IN')}
            </div>
            <div style="margin-top: 8px; text-align: right;">
              <a href="https://www.google.com/maps?q=${c.latitude},${c.longitude}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #2563eb; text-decoration: none; font-weight: 700;">
                Open in Google Maps &rarr;
              </a>
            </div>
          </div>
        `);
      });
    }

    // Auto-fit bounds if we have points and not already focused on an agent
    if (boundsPoints.length > 0 && mapInstanceRef.current && !selectedAgent) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      } catch {}
    }
  }, [filteredSalesmen, customers, showCustomers, selectedAgent]);

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
          <button 
            type="button"
            className="action-btn"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 14px', 
              background: showCustomers ? '#ecfdf5' : '#f8fafc', 
              border: `1px solid ${showCustomers ? '#10b981' : '#cbd5e1'}`, 
              color: showCustomers ? '#065f46' : '#64748b',
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
            onClick={() => setShowCustomers(prev => !prev)}
            title="Toggle customer shop markers on the live tracking radar map"
          >
            {showCustomers ? <Eye size={14} color="#059669" /> : <EyeOff size={14} color="#64748b" />}
            <span>{showCustomers ? `Customer Stores (${customers.length})` : `Show Customers (${customers.length})`}</span>
          </button>

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

      {/* Top 5 KPI Metrics */}
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
          <div className="metric-icon-wrap emerald" style={{ background: '#ecfdf5', color: '#059669' }}>
            <MapPin size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Mapped Customer Outlets</span>
            <span className="metric-val" style={{ color: '#059669' }}>{customers.length} Stores on Radar</span>
            <span className="metric-sub">Registered GPS customer locations</span>
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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#047857', fontWeight: 600 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669', border: '1px solid #ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></span>
                Customer Stores ({customers.length})
              </span>
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
