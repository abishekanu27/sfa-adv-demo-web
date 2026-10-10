import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Moon, 
  Sun, 
  Bell, 
  Download, 
  Plus, 
  ChevronRight, 
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  fetchDashboardData, 
  createSalesOrderApi, 
  allocateFieldRepApi 
} from '../services/api';
import { exportDashboardToExcel } from '../services/excelExport';
import { PageLoader } from '../components/PageLoader';
import './DashboardPreview.css';

export const DashboardPreview = ({ user, onLogout, isEmbedded = false, selectedBranchId }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRepModal, setShowRepModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // New Order Form State
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    sales_channel: 'Field Sales',
    total_amount: '',
    paid_amount: '',
    outstanding_amount: '',
    notes: ''
  });

  // New Rep Allocation Form State
  const [repForm, setRepForm] = useState({
    name: '',
    phone: '',
    assigned_vehicle: '',
    assigned_locations: '',
    current_van_stock_items: '',
    van_stock_value: '',
    cash_collected: '0',
    total_money_in_hand: '0',
    duty_status: 'On Duty'
  });

  // Main Dashboard Data from Backend / PostgreSQL
  const [dashboardData, setDashboardData] = useState({
    user: {
      name: user?.name || 'Administrator',
      role: user?.role || 'Administrator',
      email: user?.email || 'admin@salesforce.com',
      phone: user?.phone || '+91 98765 43210'
    },
    metrics: {
      total_sales_revenue: 0,
      total_orders_count: 0,
      total_collections: 0,
      cash_collections: 0,
      upi_collections: 0,
      total_stock_units: 0,
      total_stock_valuation: 0,
      warehouse_stock_units: 0,
      van_stock_units: 0,
      total_outstanding: 0,
      sales_target_attainment: 0,
      sales_target_amount: 250000
    },
    monthlyTrajectory: [
      { month: 'Jan', revenue: 0 },
      { month: 'Feb', revenue: 0 },
      { month: 'Mar', revenue: 0 },
      { month: 'Apr', revenue: 0 },
      { month: 'May', revenue: 0 },
      { month: 'Jun', revenue: 0 },
      { month: 'Jul', revenue: 0 },
      { month: 'Aug', revenue: 0 },
      { month: 'Sep', revenue: 0 },
      { month: 'Oct', revenue: 0 },
      { month: 'Nov', revenue: 0 },
      { month: 'Dec', revenue: 0 }
    ],
    channelMix: [
      { channel: 'No Sales Yet', percentage: 100, amount: 0, color: '#94a3b8' }
    ],
    fieldRepresentatives: []
  });

  const loadData = (branchOverride) => {
    setIsLoading(true);
    const branchToFetch = branchOverride !== undefined ? branchOverride : (selectedBranchId || localStorage.getItem('active_branch_id') || 'all');
    fetchDashboardData(user?.email, branchToFetch)
      .then(data => {
        if (data) {
          setDashboardData(prev => ({
            ...prev,
            ...data,
            user: {
              ...prev.user,
              ...(data.user || {}),
              name: user?.name || data.user?.name || 'Administrator',
              role: user?.role || data.user?.role || 'Administrator',
              email: user?.email || data.user?.email || 'admin@salesforce.com'
            }
          }));
        }
      })
      .catch(err => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData(selectedBranchId);
  }, [user, selectedBranchId]);

  useEffect(() => {
    const handleBranchChange = (e) => {
      const newBranchId = e?.detail?.branch_id || localStorage.getItem('active_branch_id') || 'all';
      loadData(newBranchId);
    };
    window.addEventListener('activeBranchChanged', handleBranchChange);
    return () => {
      window.removeEventListener('activeBranchChanged', handleBranchChange);
    };
  }, [user]);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Format currency helper
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Submit new sales order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      const total = parseFloat(orderForm.total_amount) || 0;
      const paid = parseFloat(orderForm.paid_amount) || 0;
      const outstanding = Math.max(0, total - paid);

      await createSalesOrderApi({
        customer_name: orderForm.customer_name,
        sales_channel: orderForm.sales_channel,
        total_amount: total,
        paid_amount: paid,
        outstanding_amount: outstanding,
        notes: orderForm.notes
      });

      showToast('Sales order recorded successfully!');
      setShowOrderModal(false);
      setOrderForm({
        customer_name: '',
        sales_channel: 'Field Sales',
        total_amount: '',
        paid_amount: '',
        outstanding_amount: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to record sales order', 'error');
    }
  };

  // Submit new field rep allocation
  const handleAllocateRep = async (e) => {
    e.preventDefault();
    try {
      await allocateFieldRepApi(repForm);
      showToast('Field representative allocated on duty!');
      setShowRepModal(false);
      setRepForm({
        name: '',
        phone: '',
        assigned_vehicle: '',
        assigned_locations: '',
        current_van_stock_items: '',
        van_stock_value: '',
        cash_collected: '0',
        total_money_in_hand: '0',
        duty_status: 'On Duty'
      });
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to allocate representative', 'error');
    }
  };

  // Export to Excel (.xlsx) Handler
  const handleExportExcel = () => {
    try {
      const res = exportDashboardToExcel(dashboardData);
      showToast(`Data sheet exported successfully in Excel format (${res.fileName})!`);
    } catch (err) {
      showToast('Failed to export Excel spreadsheet', 'error');
    }
  };

  const displayName = dashboardData.user?.name || 'Administrator';
  const displayRole = dashboardData.user?.role || 'Administrator';
  const avatarLetter = displayName.charAt(0).toUpperCase() || 'A';

  // Trajectory Timeframe & Chart Style States
  const [trajectoryTimeframe, setTrajectoryTimeframe] = useState('month'); // 'week' | 'month' | 'quarter' | 'year'
  const [chartMode, setChartMode] = useState('bar'); // 'bar' | 'area'
  const [activeHoverBar, setActiveHoverBar] = useState(null);

  // Compute active trajectory data based on chosen timeframe
  const activeTrajectoryData = React.useMemo(() => {
    if (trajectoryTimeframe === 'week') {
      if (dashboardData.trajectories?.week && dashboardData.trajectories.week.length > 0) {
        const weekData = [...dashboardData.trajectories.week];
        const sunIndex = weekData.findIndex(d => (d.label || '').toLowerCase().startsWith('sun'));
        if (sunIndex > 0) {
          return [...weekData.slice(sunIndex), ...weekData.slice(0, sunIndex)];
        }
        return weekData;
      }
      return [
        { label: 'Sun', fullLabel: 'Sunday', revenue: 0, orders: 0 },
        { label: 'Mon', fullLabel: 'Monday', revenue: Math.round(dashboardData.metrics.total_sales_revenue * 0.12), orders: 1 },
        { label: 'Tue', fullLabel: 'Tuesday', revenue: Math.round(dashboardData.metrics.total_sales_revenue * 0.18), orders: 1 },
        { label: 'Wed', fullLabel: 'Wednesday', revenue: Math.round(dashboardData.metrics.total_sales_revenue * 0.15), orders: 1 },
        { label: 'Thu', fullLabel: 'Thursday', revenue: Math.round(dashboardData.metrics.total_sales_revenue * 0.22), orders: 2 },
        { label: 'Fri', fullLabel: 'Friday (Today)', revenue: dashboardData.metrics.total_sales_revenue, orders: dashboardData.metrics.total_orders_count || 2 },
        { label: 'Sat', fullLabel: 'Saturday', revenue: 0, orders: 0 }
      ];
    }
    if (trajectoryTimeframe === 'quarter') {
      if (dashboardData.trajectories?.quarter && dashboardData.trajectories.quarter.length > 0) {
        return dashboardData.trajectories.quarter;
      }
      const tot = dashboardData.metrics.total_sales_revenue;
      return [
        { label: 'Q1', fullLabel: 'Q1 (Jan - Mar)', revenue: Math.round(tot * 0.25), orders: 1 },
        { label: 'Q2', fullLabel: 'Q2 (Apr - Jun)', revenue: Math.round(tot * 0.35), orders: 2 },
        { label: 'Q3', fullLabel: 'Q3 (Jul - Sep)', revenue: tot, orders: dashboardData.metrics.total_orders_count || 2 },
        { label: 'Q4', fullLabel: 'Q4 (Oct - Dec)', revenue: 0, orders: 0 }
      ];
    }
    if (trajectoryTimeframe === 'year') {
      if (dashboardData.trajectories?.year && dashboardData.trajectories.year.length > 0) {
        return dashboardData.trajectories.year;
      }
      const cy = new Date().getFullYear();
      const tot = dashboardData.metrics.total_sales_revenue;
      return [
        { label: String(cy - 3), fullLabel: `FY ${cy - 3}`, revenue: Math.round(tot * 0.45), orders: 3 },
        { label: String(cy - 2), fullLabel: `FY ${cy - 2}`, revenue: Math.round(tot * 0.65), orders: 4 },
        { label: String(cy - 1), fullLabel: `FY ${cy - 1}`, revenue: Math.round(tot * 0.82), orders: 6 },
        { label: String(cy), fullLabel: `FY ${cy} (Current)`, revenue: tot, orders: dashboardData.metrics.total_orders_count || 1 }
      ];
    }
    // Default 'month'
    const mData = dashboardData.trajectories?.month || dashboardData.monthlyTrajectory || [];
    return mData.map(m => ({
      label: m.month || m.label,
      fullLabel: `${m.month || m.label} 2026`,
      revenue: m.revenue || 0,
      orders: m.orders != null ? m.orders : (m.revenue > 0 ? 1 : 0)
    }));
  }, [trajectoryTimeframe, dashboardData]);

  const maxRevenue = Math.max(...activeTrajectoryData.map(m => m.revenue), 100);
  const totalTrajectorySum = activeTrajectoryData.reduce((s, d) => s + (d.revenue || 0), 0);
  const chartWidth = 720;
  const chartHeight = 150;
  const paddingX = 35;
  const paddingY = 25;
  const availableWidth = chartWidth - paddingX * 2;
  const stepX = availableWidth / (activeTrajectoryData.length - 1 || 1);

  // Compute SVG path points for line/area mode
  const points = activeTrajectoryData.map((m, i) => {
    const x = paddingX + i * stepX;
    const ratio = maxRevenue > 0 ? (m.revenue / maxRevenue) : 0;
    const y = (chartHeight - paddingY) - ratio * (chartHeight - paddingY * 2);
    return { x, y, ...m };
  });

  const pathData = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaPathData = points.length > 0
    ? `${pathData} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`
    : '';

  return (
    <div className={isEmbedded ? "dashboard-embedded-container" : `enterprise-dashboard-page ${isDarkMode ? 'dark-theme' : ''}`}>
      {/* ==================== TOAST NOTIFICATION ==================== */}
      {notification && (
        <div className={`enterprise-toast ${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* ==================== TOP NAVIGATION BAR ==================== */}
      {!isEmbedded && (
        <header className="enterprise-top-nav">
          {/* Left: Quick Search Bar (Disabled as requested) */}
          <div className="search-bar-wrapper disabled" title="Search option is disabled">
            <Search size={16} className="search-bar-icon disabled" />
            <input 
              type="text" 
              disabled
              placeholder="Search option disabled"
              className="search-bar-input disabled"
              tabIndex={-1}
            />
          </div>

          {/* Right Controls */}
          <div className="top-nav-right">
            {/* Data / Spreadsheet Excel Export Icon */}
            <button 
              className="nav-icon-btn blue-accent" 
              title="Export Data Sheet in Excel Format (.xlsx)"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet size={17} />
            </button>

            {/* Theme Toggle (Moon) */}
            <button 
              className="nav-icon-btn" 
              title="Toggle theme mode"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} className="moon-icon" />}
            </button>

            {/* Notification Bell */}
            <button className="nav-icon-btn" title="Notifications">
              <Bell size={17} />
              <span className="notification-amber-dot"></span>
            </button>

            {/* User Profile Pill */}
            <div className="user-profile-pill-container">
              <button 
                className="user-profile-pill-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <div className="purple-avatar-circle">
                  {avatarLetter}
                </div>
                <div className="user-pill-text">
                  <span className="user-pill-name">{displayName}</span>
                  <span className="user-pill-role">{displayRole}</span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showUserDropdown && (
                <div className="user-profile-dropdown">
                  <div className="dropdown-user-header">
                    <strong>{displayName}</strong>
                    <small>{dashboardData.user?.email}</small>
                    {dashboardData.user?.phone && (
                      <small className="phone-line">{dashboardData.user.phone}</small>
                    )}
                  </div>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-logout-item"
                    onClick={onLogout}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ==================== MAIN DASHBOARD BODY ==================== */}
      <main className="enterprise-main-body">
        {/* Page Title & Breadcrumbs Bar */}
        <div className="page-header-row">
          <div className="page-title-left">
            <nav className="breadcrumb-nav">
              <span className="breadcrumb-muted">Overview</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-active">Enterprise Executive Dashboard</span>
            </nav>
            <h1 className="dashboard-main-title">
              Enterprise Sales & Operations Dashboard
            </h1>
            <p className="dashboard-sub-title">
              Real-time analytics across field sales reps, active customer accounts, and order volume momentum.
            </p>
          </div>
        </div>

        {isLoading ? (
          <PageLoader 
            message="Loading executive analytics..." 
            subtext="Aggregating real-time sales orders, field reps, and metrics" 
          />
        ) : (
          <>
            {/* ==================== 6 TOP KPI METRIC CARDS ==================== */}
            <section className="kpi-metrics-grid">
          {/* Card 1: Total Sales Revenue */}
          <div className="kpi-card card-revenue">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Total Sales Revenue</span>
              <div className="kpi-icon-badge amber">
                <span className="emoji-icon">💰</span>
              </div>
            </div>
            <div className="kpi-card-value text-amber-dark">
              {formatCurrency(dashboardData.metrics.total_sales_revenue)}
            </div>
            <div className="kpi-card-subtext">
              <strong>{dashboardData.metrics.total_orders_count || 0} orders</strong>
              <span>
                {dashboardData.metrics.total_sales_revenue > 0 ? 'Gross billed sales' : 'No sales recorded yet'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Collections */}
          <div className="kpi-card card-collections">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Total Collections</span>
              <div className="kpi-icon-badge emerald">
                <span className="emoji-icon">💳</span>
              </div>
            </div>
            <div className="kpi-card-value text-emerald">
              {formatCurrency(dashboardData.metrics.total_collections || 0)}
            </div>
            <div className="kpi-card-subtext">
              <span>Cash: {formatCurrency(dashboardData.metrics.cash_collections || 0)}</span>
              <span>• UPI: {formatCurrency(dashboardData.metrics.upi_collections || 0)}</span>
            </div>
          </div>

          {/* Card 3: Total Stock Inventory */}
          <div className="kpi-card card-stock">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Total Stock Inventory</span>
              <div className="kpi-icon-badge blue">
                <span className="emoji-icon">📦</span>
              </div>
            </div>
            <div className="kpi-card-value text-primary">
              {(dashboardData.metrics.total_stock_units || 0).toLocaleString()} <span className="kpi-unit-label">Units</span>
            </div>
            <div className="kpi-card-subtext">
              <strong>Valuation: {formatCurrency(dashboardData.metrics.total_stock_valuation || 0)}</strong>
              <span>({(dashboardData.metrics.warehouse_stock_units || 0).toLocaleString()} WH + {(dashboardData.metrics.van_stock_units || 0).toLocaleString()} Van)</span>
            </div>
          </div>

          {/* Card 4: Total Customer Outstanding */}
          <div className="kpi-card card-outstanding">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Customer Outstanding</span>
              <div className="kpi-icon-badge peach">
                <span className="emoji-icon">⏳</span>
              </div>
            </div>
            <div className="kpi-card-value red-text">
              {formatCurrency(dashboardData.metrics.total_outstanding)}
            </div>
            <div className="kpi-card-subtext">
              {dashboardData.metrics.total_outstanding === 0 ? (
                <>
                  <span className="badge-clear">Clear</span>
                  <span>No pending dues</span>
                </>
              ) : (
                <>
                  <span className="badge-due">Pending</span>
                  <span>Active receivables</span>
                </>
              )}
            </div>
          </div>

          {/* Card 5: Total Invoices / Orders */}
          <div className="kpi-card card-orders">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Total Invoices / Orders</span>
              <div className="kpi-icon-badge green">
                <span className="emoji-icon">📋</span>
              </div>
            </div>
            <div className="kpi-card-value">
              {dashboardData.metrics.total_orders_count || 0} <span className="kpi-unit-label">Orders</span>
            </div>
            <div className="kpi-card-subtext">
              <strong>{dashboardData.metrics.total_orders_count || 0} orders booked</strong>
              <span>Active volume</span>
            </div>
          </div>

          {/* Card 6: Sales Target Attainment */}
          <div className="kpi-card card-target">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Sales Target Attainment</span>
              <div className="kpi-icon-badge coral">
                <span className="emoji-icon">🎯</span>
              </div>
            </div>
            <div className="kpi-card-value">
              {dashboardData.metrics.sales_target_attainment || 0}%
            </div>
            <div className="kpi-card-subtext">
              <span>Target: {formatCurrency(dashboardData.metrics.sales_target_amount || 250000)}</span>
            </div>
          </div>
        </section>

        {/* ==================== MIDDLE ROW: 2 CHARTS ==================== */}
        <section className="middle-charts-grid">
          {/* Left Chart: Total Revenue Trajectory */}
          <div className="chart-panel trajectory-panel">
            <div className="chart-panel-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 className="chart-panel-title">Total Revenue Trajectory</h3>
                  <span className="trajectory-period-sum">₹{totalTrajectorySum.toLocaleString('en-IN')}</span>
                </div>
                <p className="chart-panel-subtitle">
                  {trajectoryTimeframe === 'week' && 'Daily order momentum across current week'}
                  {trajectoryTimeframe === 'month' && 'Monthly revenue progression for the fiscal year'}
                  {trajectoryTimeframe === 'quarter' && 'Quarterly revenue aggregation (Q1 - Q4)'}
                  {trajectoryTimeframe === 'year' && 'Multi-year annual revenue growth trajectory'}
                </p>
              </div>

              {/* Timeframe & Mode Controls */}
              <div className="chart-controls-group">
                <div className="timeframe-pill-selector">
                  <button 
                    type="button" 
                    className={`timeframe-btn ${trajectoryTimeframe === 'week' ? 'active' : ''}`}
                    onClick={() => setTrajectoryTimeframe('week')}
                  >
                    Week
                  </button>
                  <button 
                    type="button" 
                    className={`timeframe-btn ${trajectoryTimeframe === 'month' ? 'active' : ''}`}
                    onClick={() => setTrajectoryTimeframe('month')}
                  >
                    Month
                  </button>
                  <button 
                    type="button" 
                    className={`timeframe-btn ${trajectoryTimeframe === 'quarter' ? 'active' : ''}`}
                    onClick={() => setTrajectoryTimeframe('quarter')}
                  >
                    Quarter
                  </button>
                  <button 
                    type="button" 
                    className={`timeframe-btn ${trajectoryTimeframe === 'year' ? 'active' : ''}`}
                    onClick={() => setTrajectoryTimeframe('year')}
                  >
                    Year
                  </button>
                </div>

                <div className="chart-type-toggle">
                  <button 
                    type="button" 
                    className={`chart-type-btn ${chartMode === 'bar' ? 'active' : ''}`}
                    onClick={() => setChartMode('bar')}
                    title="Interactive Bar Chart"
                  >
                    <BarChart3 size={14} />
                  </button>
                  <button 
                    type="button" 
                    className={`chart-type-btn ${chartMode === 'area' ? 'active' : ''}`}
                    onClick={() => setChartMode('area')}
                    title="Gradient Area Chart"
                  >
                    <Activity size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* CHART RENDERING */}
            {chartMode === 'bar' ? (
              <div className="modern-bar-chart-container">
                {/* Benchmark Guidelines */}
                <div className="bar-grid-lines">
                  <div className="grid-line top"><span>₹{maxRevenue.toLocaleString('en-IN')}</span></div>
                  <div className="grid-line mid"><span>₹{Math.round(maxRevenue / 2).toLocaleString('en-IN')}</span></div>
                  <div className="grid-line bot"><span>₹0</span></div>
                </div>

                <div className="bar-columns-wrapper">
                  {activeTrajectoryData.map((item, idx) => {
                    const heightPercent = maxRevenue > 0 ? Math.max(item.revenue > 0 ? 8 : 2, Math.round((item.revenue / maxRevenue) * 100)) : 2;
                    const isHovered = activeHoverBar === idx;
                    const hasValue = item.revenue > 0;
                    return (
                      <div 
                        key={item.label || idx}
                        className={`bar-column-item ${isHovered ? 'hovered' : ''} ${hasValue ? 'has-value' : 'zero-val'}`}
                        onMouseEnter={() => setActiveHoverBar(idx)}
                        onMouseLeave={() => setActiveHoverBar(null)}
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="bar-hover-tooltip">
                            <span className="tooltip-label">{item.fullLabel || item.label}</span>
                            <strong className="tooltip-amount">₹{item.revenue.toLocaleString('en-IN')}</strong>
                            {item.orders != null && (
                              <small className="tooltip-orders">{item.orders} order{item.orders === 1 ? '' : 's'}</small>
                            )}
                          </div>
                        )}

                        {/* Top Value Tag */}
                        {hasValue && (
                          <span className="bar-top-value">
                            ₹{item.revenue >= 1000 ? `${(item.revenue / 1000).toFixed(1)}k` : item.revenue}
                          </span>
                        )}

                        {/* Column Bar */}
                        <div className="bar-track">
                          <div 
                            className="bar-fill" 
                            style={{ 
                              height: `${heightPercent}%`,
                              background: hasValue 
                                ? (isHovered ? 'linear-gradient(180deg, #4338ca 0%, #312e81 100%)' : 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)')
                                : '#e2e8f0'
                            }}
                          ></div>
                        </div>

                        {/* X-Axis Label */}
                        <span className={`bar-axis-label ${isHovered ? 'active' : ''}`}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="trajectory-chart-container">
                <svg 
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                  className="trajectory-svg"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal dashed guideline */}
                  <line 
                    x1={paddingX} 
                    y1={chartHeight / 2} 
                    x2={chartWidth - paddingX} 
                    y2={chartHeight / 2} 
                    stroke="#e2e8f0" 
                    strokeDasharray="4 4" 
                  />

                  {/* Base guideline at 0 */}
                  <line 
                    x1={paddingX} 
                    y1={chartHeight - paddingY} 
                    x2={chartWidth - paddingX} 
                    y2={chartHeight - paddingY} 
                    stroke="#cbd5e1" 
                    strokeWidth="1" 
                  />

                  {/* Shaded Area */}
                  {areaPathData && (
                    <path d={areaPathData} fill="url(#areaGradient)" />
                  )}

                  {/* Connecting Line */}
                  <path 
                    d={pathData} 
                    fill="none" 
                    stroke="#6366f1" 
                    strokeWidth="2.5" 
                  />

                  {/* Points & Labels */}
                  {points.map((pt, i) => (
                    <g key={pt.label || i}>
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r={pt.revenue > 0 ? "5" : "3.5"} 
                        fill={pt.revenue > 0 ? "#4f46e5" : "#ffffff"} 
                        stroke="#6366f1" 
                        strokeWidth="2.5" 
                      />
                      {pt.revenue > 0 && (
                        <text
                          x={pt.x}
                          y={pt.y - 9}
                          textAnchor="middle"
                          style={{ fontSize: '10px', fontWeight: '700', fill: '#4f46e5' }}
                        >
                          ₹{pt.revenue >= 1000 ? `${(pt.revenue / 1000).toFixed(1)}k` : pt.revenue}
                        </text>
                      )}
                      <text 
                        x={pt.x} 
                        y={chartHeight - 6} 
                        textAnchor="middle" 
                        className="axis-month-label"
                      >
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* Right Chart: Sales Channel Mix */}
          <div className="chart-panel mix-panel">
            <div className="chart-panel-header">
              <div>
                <h3 className="chart-panel-title">Sales Channel Mix</h3>
                <p className="chart-panel-subtitle">Distribution by origin</p>
              </div>
            </div>

            <div className="mix-chart-body">
              {/* Donut Chart */}
              <div className="mix-donut-wrapper">
                <svg width="130" height="130" viewBox="0 0 42 42" className="donut-svg">
                  <circle 
                    cx="21" 
                    cy="21" 
                    r="15.91549430918954" 
                    fill="transparent" 
                    stroke="#f1f5f9" 
                    strokeWidth="4.5"
                  />
                  {dashboardData.metrics.total_sales_revenue > 0 ? (
                    dashboardData.channelMix.map((ch, idx) => {
                      const offset = 100 - ch.percentage;
                      return (
                        <circle
                          key={ch.channel}
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={ch.color || '#3b82f6'}
                          strokeWidth="4.5"
                          strokeDasharray={`${ch.percentage} ${offset}`}
                          strokeDashoffset="25"
                        />
                      );
                    })
                  ) : (
                    <circle 
                      cx="21" 
                      cy="21" 
                      r="15.91549430918954" 
                      fill="transparent" 
                      stroke="#e2e8f0" 
                      strokeWidth="4.5"
                    />
                  )}
                </svg>

                {/* Donut Center Text */}
                <div className="donut-center-content">
                  <div className="donut-center-amount">
                    {formatCurrency(dashboardData.metrics.total_sales_revenue)}
                  </div>
                  <div className="donut-center-label">
                    {dashboardData.metrics.total_sales_revenue > 0 ? 'Total' : 'No Sales'}
                  </div>
                </div>
              </div>

              {/* Legends */}
              <div className="mix-legends-col">
                {dashboardData.channelMix.map((ch) => (
                  <div key={ch.channel} className="mix-legend-item">
                    <span 
                      className="legend-dot" 
                      style={{ backgroundColor: ch.color || '#94a3b8' }}
                    ></span>
                    <span className="legend-name">{ch.channel}</span>
                    <span className="legend-pct">{ch.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== BOTTOM CARD: FIELD SALES REPS ==================== */}
        <section className="field-reps-card">
          <div className="reps-card-header">
            <div>
              <h3 className="reps-card-title">
                🚚 Field Sales Representatives On Duty & Live Van Stock Holdings
              </h3>
              <p className="reps-card-subtitle">
                Active salesmen in the field, vehicle assignments, real-time van inventory value, and money in possession
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="reps-table-wrapper">
            <table className="reps-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rep ID</th>
                  <th>Sales Representative</th>
                  <th>Assigned Vehicle</th>
                  <th>Assigned Locations</th>
                  <th>Current Van Stock Items</th>
                  <th>Van Stock Value</th>
                  <th>Cash Collected</th>
                  <th>Total Money In Hand</th>
                  <th>Duty Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.fieldRepresentatives.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-reps-cell">
                      No active field salesmen allocated today.
                    </td>
                  </tr>
                ) : (
                  dashboardData.fieldRepresentatives.map((rep) => (
                    <tr key={rep.rep_id || rep.id}>
                      <td>
                        <span className="product-id-badge">#{rep.rep_id || rep.id}</span>
                      </td>
                      <td className="rep-name-cell">
                        <strong>{rep.name}</strong>
                        {rep.phone && <small>{rep.phone}</small>}
                      </td>
                      <td>
                        <span className="vehicle-badge">{rep.assigned_vehicle}</span>
                      </td>
                      <td>{rep.assigned_locations}</td>
                      <td>{rep.current_van_stock_items} Items</td>
                      <td>{formatCurrency(rep.van_stock_value)}</td>
                      <td>{formatCurrency(rep.cash_collected)}</td>
                      <td>{formatCurrency(rep.total_money_in_hand)}</td>
                      <td>
                        <span className="duty-status-pill on-duty">
                          {rep.duty_status || 'On Duty'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>
      )}
      </main>

      {/* ==================== CREATE SALES ORDER MODAL ==================== */}
      {showOrderModal && (
        <div className="modal-backdrop" onClick={() => setShowOrderModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Punch New Sales Order</h3>
              <button className="modal-close-btn" onClick={() => setShowOrderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="modal-form">
              <div className="form-group">
                <label>Customer Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Metro Hypermarket, Grand Mart"
                  value={orderForm.customer_name}
                  onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Sales Channel</label>
                  <select 
                    value={orderForm.sales_channel}
                    onChange={(e) => setOrderForm({ ...orderForm, sales_channel: e.target.value })}
                  >
                    <option value="Field Sales">Field Sales</option>
                    <option value="Van Sales">Van Sales</option>
                    <option value="Direct">Direct</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Total Amount (₹) *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="e.g. 25000"
                    value={orderForm.total_amount}
                    onChange={(e) => setOrderForm({ ...orderForm, total_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Paid Amount (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="e.g. 20000"
                    value={orderForm.paid_amount}
                    onChange={(e) => setOrderForm({ ...orderForm, paid_amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Outstanding Amount (₹)</label>
                  <input 
                    type="number" 
                    readOnly
                    placeholder="Auto-calculated"
                    value={
                      Math.max(0, (parseFloat(orderForm.total_amount) || 0) - (parseFloat(orderForm.paid_amount) || 0))
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes / Remarks</label>
                <textarea 
                  rows="2"
                  placeholder="Additional order details..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowOrderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Record Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ALLOCATE FIELD REP MODAL ==================== */}
      {showRepModal && (
        <div className="modal-backdrop" onClick={() => setShowRepModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Allocate Field Sales Representative</h3>
              <button className="modal-close-btn" onClick={() => setShowRepModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAllocateRep} className="modal-form">
              <div className="form-group">
                <label>Representative Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={repForm.name}
                  onChange={(e) => setRepForm({ ...repForm, name: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+91 98765 43210"
                    value={repForm.phone}
                    onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Assigned Vehicle</label>
                  <input 
                    type="text" 
                    placeholder="TN-38-BZ-4521"
                    value={repForm.assigned_vehicle}
                    onChange={(e) => setRepForm({ ...repForm, assigned_vehicle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Assigned Locations</label>
                <input 
                  type="text" 
                  placeholder="Central Retail District, North Zone"
                  value={repForm.assigned_locations}
                  onChange={(e) => setRepForm({ ...repForm, assigned_locations: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Van Stock Items Count</label>
                  <input 
                    type="number" 
                    value={repForm.current_van_stock_items}
                    onChange={(e) => setRepForm({ ...repForm, current_van_stock_items: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Van Stock Value (₹)</label>
                  <input 
                    type="number" 
                    value={repForm.van_stock_value}
                    onChange={(e) => setRepForm({ ...repForm, van_stock_value: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowRepModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Allocate on Duty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
