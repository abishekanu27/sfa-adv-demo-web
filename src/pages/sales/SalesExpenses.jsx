import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Receipt,
  Search,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Fuel,
  Utensils,
  Car,
  Wrench,
  Truck,
  FileText,
  DollarSign,
  Users,
  CheckCircle2,
  Calendar,
  X,
  CreditCard,
  Building2,
  ChevronRight,
  Wallet,
  Coins
} from 'lucide-react';
import { 
  fetchExpensesApi, 
  createExpenseApi, 
  fetchUsersApi 
} from '../../services/api';
import './SalesExpenses.css';

const CATEGORY_MAP = {
  'Fuel': { icon: Fuel, color: '#d97706', bg: '#fef3c7', label: 'Fuel / Diesel' },
  'Fuel / Diesel': { icon: Fuel, color: '#d97706', bg: '#fef3c7', label: 'Fuel / Diesel' },
  'Food': { icon: Utensils, color: '#059669', bg: '#d1fae5', label: 'Food & Meals' },
  'Food & Meals': { icon: Utensils, color: '#059669', bg: '#d1fae5', label: 'Food & Meals' },
  'Toll': { icon: Car, color: '#4f46e5', bg: '#e0e7ff', label: 'Toll & Parking' },
  'Toll & Parking': { icon: Car, color: '#4f46e5', bg: '#e0e7ff', label: 'Toll & Parking' },
  'Vehicle Repair': { icon: Wrench, color: '#dc2626', bg: '#fee2e2', label: 'Vehicle Repair' },
  'Loading': { icon: Truck, color: '#7c3aed', bg: '#ede9fe', label: 'Loading / Porterage' },
  'Loading / Porterage': { icon: Truck, color: '#7c3aed', bg: '#ede9fe', label: 'Loading / Porterage' },
  'Miscellaneous': { icon: FileText, color: '#475569', bg: '#f1f5f9', label: 'Miscellaneous' },
  'General': { icon: Receipt, color: '#64748b', bg: '#f1f5f9', label: 'General' },
};

export const SalesExpenses = ({ user, companySettings }) => {
  const [expenses, setExpenses] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalCount: 0,
    totalCashCollected: 0,
    netInHandCash: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    salesman_id: '',
    salesman_name: '',
    category: 'Fuel / Diesel',
    amount: '',
    reason: '',
    payment_mode: 'Cash',
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, usersRes] = await Promise.all([
        fetchExpensesApi({
          search: searchQuery || undefined,
          salesman_id: selectedSalesman !== 'All' ? selectedSalesman : undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        fetchUsersApi().catch(() => ({ users: [] })),
      ]);

      const expList = expRes?.expenses || [];
      setExpenses(expList);
      if (expRes?.summary) {
        setSummary(expRes.summary);
      }

      const allUsers = usersRes?.users || [];
      const smList = allUsers.filter(u => 
        ['SALES_EXECUTIVE', 'SALESMAN', 'SLMN'].includes(u.role) ||
        ['SALES_EXECUTIVE', 'SALESMAN', 'SLMN'].includes(u.role_code)
      );
      setSalesmen(smList);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      showToast('Error loading expenses data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSalesman, selectedCategory, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    loadData();
  };

  const handleDatePresetClick = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let s = '';
    let e = '';

    if (preset === 'TODAY') {
      s = now.toISOString().split('T')[0];
      e = s;
    } else if (preset === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      s = d.toISOString().split('T')[0];
      e = now.toISOString().split('T')[0];
    } else if (preset === 'MONTH') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      s = d.toISOString().split('T')[0];
      e = now.toISOString().split('T')[0];
    } else if (preset === 'ALL') {
      s = '';
      e = '';
    }

    setStartDate(s);
    setEndDate(e);
  };

  // Aggregated KPIs
  const kpiMetrics = useMemo(() => {
    const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalCount = expenses.length;

    const uniqueSalesmen = new Set(expenses.map(e => e.salesman_name || e.salesman_id).filter(Boolean));

    const fuelSpend = expenses
      .filter(e => e.category?.toLowerCase().includes('fuel') || e.category?.toLowerCase().includes('diesel'))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const vehicleRepairSpend = expenses
      .filter(e => e.category?.toLowerCase().includes('repair') || e.category?.toLowerCase().includes('toll'))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const netInHandCash = summary.netInHandCash !== undefined
      ? summary.netInHandCash
      : Math.max(0, (summary.totalCashCollected || 0) - totalAmount);

    return {
      totalAmount,
      totalCount,
      activeSalesmenCount: uniqueSalesmen.size,
      fuelSpend,
      vehicleRepairSpend,
      avgExpense: totalCount > 0 ? totalAmount / totalCount : 0,
      totalCashCollected: summary.totalCashCollected || 0,
      netInHandCash,
    };
  }, [expenses, summary]);

  // Aggregated by Salesman
  const salesmanSummaries = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const name = e.salesman_name || 'Unassigned';
      if (!map[name]) {
        map[name] = {
          name,
          salesman_id: e.salesman_id,
          totalAmount: 0,
          count: 0,
        };
      }
      map[name].totalAmount += Number(e.amount) || 0;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenses]);

  // Handle Export to Excel
  const handleExportExcel = () => {
    try {
      if (expenses.length === 0) {
        showToast('No expense records to export', 'error');
        return;
      }

      const rows = expenses.map(exp => ({
        'Expense Code': exp.expense_code || exp.id,
        'Date': exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-IN') : '',
        'Salesman Name': exp.salesman_name || 'N/A',
        'Salesman ID': exp.salesman_id || '',
        'Category': exp.category || 'General',
        'Reason / Purpose': exp.reason || '',
        'Amount (INR)': Number(exp.amount) || 0,
        'Payment Mode': exp.payment_mode || 'Cash',
        'Status': exp.status === 'Settled' ? 'Settled' : 'Pending',
        'Created At': exp.created_at ? new Date(exp.created_at).toLocaleString('en-IN') : '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Salesman Expenses');
      XLSX.writeFile(wb, `Salesman_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Expenses report exported to Excel successfully!');
    } catch (e) {
      console.error('Export error:', e);
      showToast('Failed to export Excel file', 'error');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const numAmt = parseFloat(modalForm.amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast('Please enter a valid expense amount greater than 0', 'error');
      return;
    }
    if (!modalForm.reason.trim()) {
      showToast('Expense reason is mandatory', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createExpenseApi({
        ...modalForm,
        amount: numAmt,
        reason: modalForm.reason.trim(),
      });
      showToast('Expense successfully recorded!');
      setIsAddModalOpen(false);
      setModalForm({
        salesman_id: '',
        salesman_name: '',
        category: 'Fuel / Diesel',
        amount: '',
        reason: '',
        payment_mode: 'Cash',
        expense_date: new Date().toISOString().slice(0, 10),
      });
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to record expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sales-expenses-page">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          fontWeight: 600,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="expenses-page-header">
        <div className="expenses-header-left">
          <div className="expenses-breadcrumbs">
            <span>Sales</span>
            <ChevronRight size={14} />
            <span className="active">Expenses</span>
          </div>
          <div className="expenses-title-row">
            <h1 className="expenses-main-title">Salesman Expenses</h1>
            <span className="expenses-count-badge">
              {expenses.length} Records
            </span>
          </div>
          <p className="expenses-sub-title">
            Live operational expenses, fuel bills, vehicle maintenance, and route meal allowances logged by field salesmen.
          </p>
        </div>

        <div className="expenses-header-actions">
          <button className="btn-secondary-action" onClick={loadData} title="Refresh records">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button className="btn-secondary-action" onClick={handleExportExcel} title="Export to Excel">
            <Download size={15} />
            <span>Export Excel</span>
          </button>

          <button className="btn-primary-action" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="expenses-kpi-grid">
        <div className="expenses-kpi-card" style={{ borderColor: '#bbf7d0', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}>
          <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Wallet size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Net In-Hand Cash</span>
            <span className="kpi-value" style={{ color: '#16a34a' }}>
              ₹{(kpiMetrics.netInHandCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="kpi-subtext" style={{ color: '#15803d', fontWeight: 600 }}>
              Physical cash available to deposit
            </span>
          </div>
        </div>

        <div className="expenses-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Coins size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Gross Cash Collected</span>
            <span className="kpi-value" style={{ color: '#2563eb' }}>
              +₹{(kpiMetrics.totalCashCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="kpi-subtext">Spot sales & cash receipts</span>
          </div>
        </div>

        <div className="expenses-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <Receipt size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Expenses Deducted</span>
            <span className="kpi-value" style={{ color: '#dc2626' }}>
              -₹{kpiMetrics.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="kpi-subtext">{kpiMetrics.totalCount} receipts recorded</span>
          </div>
        </div>

        <div className="expenses-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Fuel size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Fuel & Diesel</span>
            <span className="kpi-value" style={{ color: '#b45309' }}>
              ₹{kpiMetrics.fuelSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="kpi-subtext">Fleet mobility fuel spend</span>
          </div>
        </div>

        <div className="expenses-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#f1f5f9', color: '#475569' }}>
            <Wrench size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Vehicle & Tolls</span>
            <span className="kpi-value">
              ₹{kpiMetrics.vehicleRepairSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="kpi-subtext">Repairs, parking & corridor tolls</span>
          </div>
        </div>
      </div>

      {/* Salesman-Wise Aggregate Breakdown Grid */}
      {salesmanSummaries.length > 0 && (
        <div className="salesman-breakdown-section">
          <div className="section-sub-header">
            <h3 className="section-sub-title">Salesman Spending Breakdown</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Click any salesman to filter transactions
            </span>
          </div>
          <div className="salesman-cards-grid">
            <div 
              className={`salesman-expense-chip ${selectedSalesman === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedSalesman('All')}
            >
              <div className="chip-name">All Salesmen</div>
              <div className="chip-amount">₹{kpiMetrics.totalAmount.toLocaleString('en-IN')}</div>
              <div className="chip-meta">
                <span>{kpiMetrics.totalCount} receipts</span>
                <span style={{ color: '#2563eb', fontWeight: 600 }}>Show All</span>
              </div>
            </div>

            {salesmanSummaries.map(sm => {
              const isSelected = selectedSalesman === sm.name || selectedSalesman === sm.salesman_id;
              return (
                <div
                  key={sm.name}
                  className={`salesman-expense-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedSalesman(isSelected ? 'All' : sm.name)}
                >
                  <div className="chip-name" title={sm.name}>{sm.name}</div>
                  <div className="chip-amount">₹{sm.totalAmount.toLocaleString('en-IN')}</div>
                  <div className="chip-meta">
                    <span>{sm.count} expenses</span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>
                      {isSelected ? 'Filtered' : 'Filter'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="expenses-filter-bar">
        <div className="filter-left-controls">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="search-input-box">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by reason, code, salesman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Salesman Filter */}
          <select
            className="filter-select"
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
          >
            <option value="All">All Salesmen</option>
            {salesmen.map(sm => (
              <option key={sm.id} value={sm.name || sm.username}>
                {sm.name || sm.username} ({sm.phone || 'Field Rep'})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Fuel">Fuel / Diesel</option>
            <option value="Food">Food & Meals</option>
            <option value="Toll">Toll & Parking</option>
            <option value="Vehicle Repair">Vehicle Repair</option>
            <option value="Loading">Loading / Porterage</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>

          {/* Date Presets */}
          <div className="date-preset-pills">
            {['ALL', 'TODAY', 'WEEK', 'MONTH'].map(preset => (
              <button
                key={preset}
                type="button"
                className={`date-pill ${datePreset === preset ? 'active' : ''}`}
                onClick={() => handleDatePresetClick(preset)}
              >
                {preset === 'ALL' ? 'All Time' : preset === 'TODAY' ? 'Today' : preset === 'WEEK' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Date Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            className="filter-select"
            value={startDate}
            onChange={(e) => {
              setDatePreset('CUSTOM');
              setStartDate(e.target.value);
            }}
            title="Start Date"
          />
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
          <input
            type="date"
            className="filter-select"
            value={endDate}
            onChange={(e) => {
              setDatePreset('CUSTOM');
              setEndDate(e.target.value);
            }}
            title="End Date"
          />
        </div>
      </div>

      {/* Detailed Expenses Data Table */}
      <div className="expenses-table-container">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Loading field expenses from database...</p>
          </div>
        ) : expenses.length > 0 ? (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Date & Time</th>
                <th>Salesman</th>
                <th>Category</th>
                <th>Reason / Description</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const catObj = CATEGORY_MAP[exp.category] || CATEGORY_MAP['General'];
                const IconComp = catObj.icon;
                const dateStr = exp.expense_date
                  ? new Date(exp.expense_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '';

                return (
                  <tr key={exp.id || exp.expense_code}>
                    <td>
                      <span className="code-badge">{exp.expense_code || exp.id}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{dateStr || 'Today'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="salesman-meta-cell">
                        <div className="salesman-avatar-small">
                          {(exp.salesman_name || '—').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="salesman-name-text">{exp.salesman_name || '—'}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {exp.salesman_id ? `ID: ${exp.salesman_id}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="category-badge-chip"
                        style={{ backgroundColor: catObj.bg, color: catObj.color }}
                      >
                        <IconComp size={14} />
                        <span>{exp.category || 'General'}</span>
                      </span>
                    </td>
                    <td>
                      <div className="reason-text" title={exp.reason}>
                        {exp.reason}
                      </div>
                    </td>
                    <td>
                      <span className={`payment-mode-pill ${(exp.payment_mode || 'Cash').toLowerCase()}`}>
                        {exp.payment_mode || 'Cash'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill-badge ${(exp.status || 'Pending').toLowerCase()}`}>
                        {exp.status === 'Settled' ? '✓ Settled' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="amount-text-bold">
                        -₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="expenses-empty-state">
            <div className="empty-icon-wrap">
              <Receipt size={32} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              No Expenses Recorded
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              No field expenses match your current filters or date range.
            </p>
            <button className="btn-primary-action" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={15} />
              <span>Record First Expense</span>
            </button>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay-bg">
          <div className="expense-modal-box">
            <div className="modal-header-top">
              <h3>Record Field Expense</h3>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body-form">
                {/* Salesman Select */}
                <div className="form-field-group">
                  <label>Assign to Salesman</label>
                  <select
                    value={modalForm.salesman_name}
                    onChange={(e) => {
                      const selected = salesmen.find(s => (s.name || s.username) === e.target.value);
                      setModalForm({
                        ...modalForm,
                        salesman_name: e.target.value,
                        salesman_id: selected?.id ? String(selected.id) : '',
                      });
                    }}
                  >
                    <option value="">General Field Expense</option>
                    {salesmen.map(sm => (
                      <option key={sm.id} value={sm.name || sm.username}>
                        {sm.name || sm.username} ({sm.phone || 'Field Sales'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Select */}
                <div className="form-field-group">
                  <label>Expense Category <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={modalForm.category}
                    onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                    required
                  >
                    <option value="Fuel / Diesel">Fuel / Diesel</option>
                    <option value="Food & Meals">Food & Meals</option>
                    <option value="Toll & Parking">Toll & Parking</option>
                    <option value="Vehicle Repair">Vehicle Repair</option>
                    <option value="Loading / Porterage">Loading / Porterage</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                {/* Amount */}
                <div className="form-field-group">
                  <label>Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={modalForm.amount}
                    onChange={(e) => setModalForm({ ...modalForm, amount: e.target.value })}
                    required
                  />
                </div>

                {/* Reason */}
                <div className="form-field-group">
                  <label>Reason / Purpose <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Fuel top-up 15L at HPCL, Toll at toll plaza..."
                    value={modalForm.reason}
                    onChange={(e) => setModalForm({ ...modalForm, reason: e.target.value })}
                    required
                  />
                </div>

                {/* Date & Payment Mode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-field-group">
                    <label>Expense Date</label>
                    <input
                      type="date"
                      value={modalForm.expense_date}
                      onChange={(e) => setModalForm({ ...modalForm, expense_date: e.target.value })}
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Payment Mode</label>
                    <select
                      value={modalForm.payment_mode}
                      onChange={(e) => setModalForm({ ...modalForm, payment_mode: e.target.value })}
                    >
                      <option value="Cash">Cash (Physical In-Hand)</option>
                      <option value="Online">Online / UPI</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Confirm Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesExpenses;
