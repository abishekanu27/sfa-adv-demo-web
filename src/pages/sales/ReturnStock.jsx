import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Search, 
  Calendar, 
  Printer, 
  X, 
  AlertOctagon, 
  Boxes, 
  CheckCircle2, 
  DollarSign, 
  User, 
  Truck,
  Smartphone,
  FileText
} from 'lucide-react';
import './ReturnStock.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ReturnStock = ({ companySettings }) => {
  const [returns, setReturns] = useState([]);
  const [summary, setSummary] = useState({
    totalReturns: 0,
    totalUnits: 0,
    totalAmount: 0,
    totalRefunded: 0,
    damagedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`${API_BASE}/sales/returns?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReturns(data.returns || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching return stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [searchQuery, startDate, endDate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const extractReturnReason = (notes) => {
    if (!notes) return 'Customer Return';
    const match = notes.match(/\[RETURN REASON\]:\s*([^|]+)/i);
    return match ? match[1].trim() : 'Customer Return';
  };

  const extractRefundInfo = (notes) => {
    if (!notes) return 'None';
    const match = notes.match(/\[REFUND\]:\s*([^|]+)/i);
    return match ? match[1].trim() : 'Standard Adjustment';
  };

  const handlePrintReturnVoucher = (ret) => {
    if (!ret) return;
    const companyName = companySettings?.company_name || '';
    const companyAddress = companySettings?.address || '';
    const companyPhone = companySettings?.phone || '';
    const companyGstin = companySettings?.gstin || '';
    const dateFormatted = formatDate(ret.booking_date || ret.created_at);
    const totalQty = parseFloat(ret.total_qty || 0).toFixed(2);
    const totalAmount = parseFloat(ret.total_amount || 0);
    const unitPrice = (totalAmount / (parseFloat(ret.total_qty) || 1)).toFixed(2);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Return Voucher - ${ret.return_code || 'VOUCHER'}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .voucher-container {
            max-width: 720px;
            margin: 0 auto;
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 24px;
          }
          .company-header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .company-name {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .company-details {
            font-size: 12px;
            color: #475569;
            margin-top: 4px;
          }
          .voucher-badge {
            display: inline-block;
            margin-top: 10px;
            padding: 5px 18px;
            background: #f1f5f9;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .meta-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
          }
          .meta-col { font-size: 13px; }
          .meta-col.text-right { text-align: right; }
          .meta-label {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .meta-value {
            font-weight: 800;
            font-size: 14px;
            color: #0f172a;
          }
          .meta-sub {
            font-size: 12px;
            color: #475569;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            text-align: left;
          }
          th.text-right, td.text-right { text-align: right; }
          td {
            padding: 11px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
          }
          .total-row td {
            font-weight: 800;
            font-size: 14px;
            background: #f8fafc;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
          }
          .audit-box {
            background: #fef2f2;
            border: 1.5px solid #fee2e2;
            border-radius: 8px;
            padding: 14px;
            margin-top: 20px;
            font-size: 13px;
          }
          .audit-title {
            font-weight: 800;
            color: #991b1b;
            margin-bottom: 4px;
          }
          .audit-desc {
            color: #7f1d1d;
            line-height: 1.4;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            margin-top: 65px;
            padding-top: 20px;
          }
          .sig-line {
            border-top: 1px dashed #64748b;
            width: 220px;
            text-align: center;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          .sig-right {
            display: flex;
            justify-content: flex-end;
          }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div class="company-header">
            <div class="company-name">${companyName}</div>
            <div class="company-details">
              ${companyAddress ? `${companyAddress} • ` : ''}
              ${companyPhone ? `Ph: ${companyPhone} • ` : ''}
              ${companyGstin ? `GSTIN: ${companyGstin}` : ''}
            </div>
            <div class="voucher-badge">Customer Return Voucher</div>
          </div>

          <div class="meta-box">
            <div class="meta-col">
              <div class="meta-label">Voucher Number</div>
              <div class="meta-value">${ret.return_code || 'RET-VOUCHER'}</div>
              <div class="meta-sub">Ref: ${ret.booking_code || ret.id || 'N/A'}</div>
            </div>
            <div class="meta-col text-right">
              <div class="meta-label">Date of Return</div>
              <div class="meta-value">${dateFormatted}</div>
              <div class="meta-sub">Van Stock Inward Entry</div>
            </div>
            <div class="meta-col" style="margin-top: 8px;">
              <div class="meta-label">Customer Information</div>
              <div class="meta-value">${ret.customer_name || 'Customer'}</div>
              <div class="meta-sub">${ret.customer_place || ''} ${ret.customer_phone ? `• ${ret.customer_phone}` : ''}</div>
            </div>
            <div class="meta-col text-right" style="margin-top: 8px;">
              <div class="meta-label">Collecting Sales Representative</div>
              <div class="meta-value">${ret.salesman_name || '—'}</div>
              <div class="meta-sub">Field Van Route Delivery</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Returned Product / SKU Description</th>
                <th class="text-right">Qty Returned</th>
                <th class="text-right">Unit Rate</th>
                <th class="text-right">Total Refund / Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><strong>${ret.product_name || 'Returned SKU Item'}</strong></td>
                <td class="text-right"><strong>${totalQty} Units</strong></td>
                <td class="text-right">₹${unitPrice}</td>
                <td class="text-right"><strong>₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="2">TOTAL RETURN CREDIT / REFUND</td>
                <td class="text-right">${totalQty} Units</td>
                <td></td>
                <td class="text-right">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div class="audit-box">
            <div class="audit-title">Return Reason &amp; Refund Audit:</div>
            <div class="audit-desc">${ret.notes || 'Customer return processed on field delivery route.'}</div>
          </div>

          <div class="signatures">
            <div>
              <div class="sig-line">Customer Signature / Verification</div>
            </div>
            <div class="sig-right">
              <div class="sig-line">Authorised Sales Representative</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    } else {
      window.print();
    }
  };

  return (
    <div className="return-stock-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-left">
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-muted">Sales Management</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-active">Return Stock</span>
          </nav>
          <h1 className="dashboard-main-title">
            Product Returns &amp; Van Inward Replenishments
          </h1>
          <p className="dashboard-sub-title">
            Live database records of products returned from customer outlets, field van collections, damage inspections, and inventory restock credits.
          </p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="action-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            onClick={loadReturns}
          >
            <RotateCcw size={14} />
            <span>Refresh Returns</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="return-metrics-grid">
        <div className="return-metric-card">
          <div className="metric-icon-wrap blue">
            <RotateCcw size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Field Returns</span>
            <span className="metric-val">{summary.totalReturns} Inward Batches</span>
            <span className="metric-sub">Synced from Mobile App &amp; Field</span>
          </div>
        </div>

        <div className="return-metric-card">
          <div className="metric-icon-wrap green">
            <Boxes size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Returned Product Units</span>
            <span className="metric-val green-text">{Number(summary.totalUnits || 0).toLocaleString('en-IN')} Units</span>
            <span className="metric-sub">Restocked to Van &amp; Depot</span>
          </div>
        </div>

        <div className="return-metric-card">
          <div className="metric-icon-wrap red">
            <AlertOctagon size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Damaged / Scrap Items</span>
            <span className="metric-val red-text">{summary.damagedCount} Incidents</span>
            <span className="metric-sub">Sent for loss claim &amp; audit</span>
          </div>
        </div>

        <div className="return-metric-card">
          <div className="metric-icon-wrap amber">
            <DollarSign size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Returned Value</span>
            <span className="metric-val">₹{Number(summary.totalAmount || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">Refunds &amp; Credit adjustments</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="return-controls-bar">
        <div className="return-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by Return #, Customer, Product, Salesman, Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="return-date-filters">
          <Calendar size={15} color="#64748b" />
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            title="Start Date"
          />
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            title="End Date"
          />
          {(startDate || endDate || searchQuery) && (
            <button 
              type="button" 
              onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); }}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Returns Table */}
      <div className="return-table-card">
        <table className="return-data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Return #</th>
              <th>Date</th>
              <th>Customer Details</th>
              <th>Salesman</th>
              <th>Returned Products / Summary</th>
              <th style={{ textAlign: 'right' }}>Total Qty</th>
              <th>Return Reason</th>
              <th style={{ textAlign: 'right' }}>Return Value</th>
              <th>Refund Info</th>
              <th style={{ textAlign: 'center' }}>Sync Status</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading return stock records from PostgreSQL...
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <RotateCcw size={32} style={{ margin: '0 auto 12px auto', color: '#94a3b8' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No return stock records found</p>
                  <small style={{ color: '#94a3b8' }}>Customer returns registered on Mobile App will automatically sync and appear here.</small>
                </td>
              </tr>
            ) : (
              returns.map((ret, i) => {
                const reason = extractReturnReason(ret.notes);
                const isDamaged = reason.toLowerCase().includes('damage');
                const refund = extractRefundInfo(ret.notes);

                return (
                  <tr key={ret.booking_id || i}>
                    <td>
                      <span className="return-code-pill">{ret.return_code}</span>
                    </td>
                    <td>
                      <div>{formatDate(ret.booking_date || ret.created_at)}</div>
                      <small style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(ret.created_at || ret.booking_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </td>
                    <td>
                      <strong>{ret.customer_name}</strong>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {ret.customer_place ? `${ret.customer_place} • ` : ''}{ret.customer_phone || ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} color="#2563eb" />
                        <span>{ret.salesman_name || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '320px', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 600 }}>{ret.product_name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      {parseFloat(ret.total_qty || 0).toLocaleString('en-IN')} Units
                    </td>
                    <td>
                      <span className={`reason-tag ${isDamaged ? 'damage' : ''}`}>
                        {reason}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      ₹{parseFloat(ret.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <small style={{ fontSize: '11.5px', color: '#475569' }}>
                        {refund}
                      </small>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sync-badge">
                        <Smartphone size={11} />
                        <span>Synced</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#0f172a'
                        }}
                        title="View Return Note Voucher"
                        onClick={() => setSelectedReturn(ret)}
                      >
                        <FileText size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Return Note Voucher Modal */}
      {selectedReturn && (
        <div className="return-modal-overlay" onClick={() => setSelectedReturn(null)}>
          <div className="return-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="return-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Customer Return Voucher — {selectedReturn.return_code}
                </h3>
                <small style={{ color: '#64748b' }}>
                  Recorded on {formatDate(selectedReturn.booking_date || selectedReturn.created_at)}
                </small>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedReturn(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="return-modal-body">
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Customer Name</span>
                    <div style={{ fontWeight: 700 }}>{selectedReturn.customer_name}</div>
                    <small>{selectedReturn.customer_place} • {selectedReturn.customer_phone}</small>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Collecting Salesman</span>
                    <div style={{ fontWeight: 700 }}>{selectedReturn.salesman_name || '—'}</div>
                    <small>Field Sales Van Delivery</small>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700 }}>Returned Items Breakdown:</h4>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                    {selectedReturn.product_name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#475569' }}>
                    <span>Quantity Returned: <strong>{selectedReturn.total_qty} Units</strong></span>
                    <span>Total Value: <strong>₹{parseFloat(selectedReturn.total_amount || 0).toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', fontSize: '12.5px' }}>
                <strong style={{ color: '#991b1b' }}>Return Reason &amp; Refund Audit:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#7f1d1d' }}>{selectedReturn.notes || 'Standard customer return'}</p>
              </div>
            </div>

            <div className="return-modal-footer">
              <button
                type="button"
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedReturn(null)}
              >
                Close
              </button>
              <button
                type="button"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => handlePrintReturnVoucher(selectedReturn)}
              >
                <Printer size={14} />
                <span>Print Return Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
