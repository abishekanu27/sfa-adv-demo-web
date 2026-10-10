import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  CreditCard,
  Clock,
  Boxes,
  DollarSign,
  AlertTriangle,
  Warehouse,
  Truck,
  Users,
  AlertOctagon,
  Building,
  Building2,
  Receipt,
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  TrendingUp,
  Download,
  ShieldAlert,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { fetchReportsSummary, fetchReportData, fetchCompanySettings } from '../../services/api';
import { 
  getUserFromStorage, 
  isUserAdmin, 
  hasPurchasesVendorsPermission 
} from '../../utils/permissions';
import './ReportsHub.css';

// 11 Report Definitions
export const REPORT_CONFIGS = [
  {
    id: 'payments',
    slug: 'payments',
    label: 'Payment',
    fullTitle: 'Customer Payment Transactions',
    icon: CreditCard,
    color: '#2563eb',
    badge: 'Finance'
  },
  {
    id: 'outstanding',
    slug: 'outstanding',
    label: 'Outstanding',
    fullTitle: 'Customer Receivables & Aging Ledger',
    icon: Clock,
    color: '#d97706',
    badge: 'Receivables'
  },
  {
    id: 'total-stocks',
    slug: 'total-stocks',
    label: 'Total stocks',
    fullTitle: 'Consolidated Stock Valuation & Units',
    icon: Boxes,
    color: '#059669',
    badge: 'Inventory'
  },
  {
    id: 'collections',
    slug: 'collections',
    label: 'Total collection',
    fullTitle: 'Daily & Channel Collection Analysis',
    icon: DollarSign,
    color: '#7c3aed',
    badge: 'Cash Flow'
  },
  {
    id: 'pending-payments',
    slug: 'pending-payments',
    label: 'Pending payments',
    fullTitle: 'Unsettled Bookings & Invoice Balances',
    icon: AlertTriangle,
    color: '#ea580c',
    badge: 'Credit Dues'
  },
  {
    id: 'warehouse-stock',
    slug: 'warehouse-stock',
    label: 'Warehouse wise stock',
    fullTitle: 'Multi-Depot Inventory Distribution',
    icon: Warehouse,
    color: '#0891b2',
    badge: 'Depot'
  },
  {
    id: 'salesman-stock',
    slug: 'salesman-stock',
    label: 'Sales Man wise stock',
    fullTitle: 'Live Field Van Stock Allocations',
    icon: Truck,
    color: '#4f46e5',
    badge: 'Fleet'
  },
  {
    id: 'salesman-collections',
    slug: 'salesman-collections',
    label: 'Salesman wise Collections',
    fullTitle: 'Sales Rep Field Collection Log',
    icon: Users,
    color: '#0284c7',
    badge: 'Field Sales'
  },
  {
    id: 'damaged-products',
    slug: 'damaged-products',
    label: 'Damaged Products',
    fullTitle: 'Damage, Transit Breakage & Loss Valuation',
    icon: AlertOctagon,
    color: '#dc2626',
    badge: 'Loss Audit'
  },
  {
    id: 'vendor-stock',
    slug: 'vendor-stock',
    label: 'Vendor wise stock',
    fullTitle: 'Supplier Inward Sourced Inventory',
    icon: Building,
    color: '#16a34a',
    badge: 'Procurement'
  },
  {
    id: 'vendor-payments',
    slug: 'vendor-payments',
    label: 'Vendor wise payments',
    fullTitle: 'Accounts Payable & Supplier Dues',
    icon: Receipt,
    color: '#9333ea',
    badge: 'Payables'
  },
  {
    id: 'gst',
    slug: 'gst',
    label: 'GST Returns (1, 2B, 3B)',
    fullTitle: 'GST Statutory Returns Center (GSTR-1, GSTR-2B & GSTR-3B)',
    icon: Building2,
    color: '#0d9488',
    badge: 'Statutory Returns'
  },
  {
    id: 'customer-wise',
    slug: 'customer-wise',
    label: 'Customer wise report',
    fullTitle: 'Customer Wise Purchase & Order History',
    icon: Users,
    color: '#0284c7',
    badge: 'Customer Ledger'
  },
  {
    id: 'ledger',
    slug: 'ledger',
    label: 'Ledger report',
    fullTitle: 'Customer Financial Ledger & Statement of Account',
    icon: BookOpen,
    color: '#0284c7',
    badge: 'Account Ledger'
  },
  {
    id: 'expenses',
    slug: 'expenses',
    label: 'Expenses Report',
    fullTitle: 'Salesman Expenses & In-Hand Cash Reconciliation',
    icon: Receipt,
    color: '#e11d48',
    badge: 'Field Expenses'
  }
];

const AlertCirclePlaceholder = ({ icon: Icon }) => (
  <div style={{
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    color: '#94a3b8'
  }}>
    {Icon ? <Icon size={28} /> : null}
  </div>
);

export const ReportsHub = ({ initialTab = 'payments', user, selectedBranchId }) => {
  const currentUser = user || getUserFromStorage();
  const isAdmin = isUserAdmin(currentUser);
  const allowedModules = currentUser?.allowed_modules || [];
  const canAccessVendors = hasPurchasesVendorsPermission(currentUser);

  // Compute reports permitted for this role
  const allowedReportConfigs = useMemo(() => {
    return REPORT_CONFIGS.filter(rep => {
      // Condition: Vendor reports strictly require Purchases & Vendors permission
      if ((rep.id === 'vendor-stock' || rep.id === 'vendor-payments') && !canAccessVendors) {
        return false;
      }

      if (isAdmin) return true;
      if (!Array.isArray(allowedModules)) return true;
      if (allowedModules.includes('all_access')) return true;

      const repKey = `reports-${rep.id}`;
      const slugKey = `reports-${rep.slug}`;
      return allowedModules.includes(repKey) || 
             allowedModules.includes(slugKey) || 
             allowedModules.includes(rep.id) || 
             allowedModules.includes(rep.slug) ||
             allowedModules.includes('reports');
    });
  }, [isAdmin, allowedModules, canAccessVendors]);

  // Normalize initialTab from sidebar format (e.g. 'reports-outstanding' -> 'outstanding')
  const normalizeTab = (tab) => {
    const list = allowedReportConfigs.length > 0 ? allowedReportConfigs : REPORT_CONFIGS;
    if (!tab) return list[0]?.id || 'payments';
    const cleaned = tab.replace(/^reports-/, '');
    if (cleaned === 'damaged') return 'damaged-products';
    if (cleaned === 'total') return 'total-stocks';
    if (cleaned === 'gst') return 'gst';
    if (cleaned === 'customer-wise') return 'customer-wise';
    if (cleaned === 'ledger') return 'ledger';
    if (cleaned === 'expenses') return 'expenses';
    const found = list.find(r => r.id === cleaned || r.slug === cleaned);
    return found ? found.id : (list[0]?.id || 'payments');
  };

  const [activeReportId, setActiveReportId] = useState(() => normalizeTab(initialTab));
  const [summaryMetrics, setSummaryMetrics] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');
  const [secondaryFilter, setSecondaryFilter] = useState('All');
  const [gstReturnMode, setGstReturnMode] = useState('gstr1'); // 'gstr1' | 'gstr2' | 'gstr3b'
  const [gstSubTab, setGstSubTab] = useState('all'); // gstr1: 'all' | 'b2b' | 'b2c' | 'hsn' | 'docs'; gstr2: 'all' | 'b2b' | 'vendor'; gstr3b: 'all' | '3.1' | '4' | '6.1'
  const [customerFilter, setCustomerFilter] = useState('All');
  const [customersList, setCustomersList] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    fetchCompanySettings().then(res => {
      if (res) setCompanySettings(res);
    }).catch(() => {});
  }, []);

  // Keep active tab in sync if initialTab or allowed configs change
  useEffect(() => {
    setActiveReportId(normalizeTab(initialTab));
  }, [initialTab, allowedReportConfigs]);

  const activeConfig = useMemo(() => {
    const list = allowedReportConfigs.length > 0 ? allowedReportConfigs : REPORT_CONFIGS;
    return list.find(r => r.id === activeReportId) || list[0] || REPORT_CONFIGS[0];
  }, [activeReportId, allowedReportConfigs]);

  // Load master metrics
  const loadMasterMetrics = async (branchOverride) => {
    try {
      const activeBranch = branchOverride !== undefined ? branchOverride : (selectedBranchId || localStorage.getItem('sf_nexus_active_branch') || 'all');
      const data = await fetchReportsSummary(activeBranch);
      if (data) setSummaryMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  // Load specific report data
  const loadReportData = async (
    reportSlug = activeConfig.slug,
    query = searchQuery,
    filter = secondaryFilter,
    sDate = startDate,
    eDate = endDate,
    gType = gstSubTab,
    custId = customerFilter,
    branchOverride
  ) => {
    setLoading(true);
    try {
      const activeBranch = branchOverride !== undefined ? branchOverride : (selectedBranchId || localStorage.getItem('sf_nexus_active_branch') || 'all');
      const params = {};
      if (activeBranch && activeBranch !== 'all') {
        params.branch_id = activeBranch;
      }
      if (query && query.trim()) params.search = query.trim();
      if (sDate) params.startDate = sDate;
      if (eDate) params.endDate = eDate;

      // Secondary filters
      if (filter && filter !== 'All') {
        if (reportSlug === 'payments') params.mode = filter;
        if (reportSlug === 'damaged-products') params.reason = filter;
        if (reportSlug === 'total-stocks') params.category = filter;
        if (reportSlug === 'customer-wise') params.payment_status = filter;
        if (reportSlug === 'ledger') params.type = filter;
      }

      // Customer filter
      if ((reportSlug === 'customer-wise' || reportSlug === 'ledger') && custId && custId !== 'All') {
        params.customerId = custId;
        params.customer_id = custId;
      }

      // GST specific filter
      if (reportSlug === 'gst' && gType !== 'hsn') {
        params.gstType = gType;
      }

      const res = await fetchReportData(reportSlug, params);
      if (reportSlug === 'expenses') {
        const data = res.report || [];
        setReportData({
          totalRecords: data.length,
          data,
          expensesList: res.expenses || [],
          summary: {
            totalAmount: res.totals?.totalExpenses || 0,
            totalExpenses: res.totals?.totalExpenses || 0,
            totalCashCollected: res.totals?.totalCashCollected || 0,
            netInHandCash: (res.totals?.totalCashCollected || 0) - (res.totals?.totalExpenses || 0),
            totalCount: res.totals?.totalTransactions || 0,
          }
        });
      } else {
        setReportData(res);
      }
      if (res?.customers && Array.isArray(res.customers)) {
        setCustomersList(res.customers);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      showToast('Error loading report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterMetrics(selectedBranchId);
  }, [selectedBranchId]);

  useEffect(() => {
    const handleActiveBranchChanged = (e) => {
      const bId = e?.detail?.branchId;
      loadMasterMetrics(bId);
      loadReportData(activeConfig.slug, searchQuery, secondaryFilter, startDate, endDate, gstSubTab, customerFilter, bId);
    };
    window.addEventListener('activeBranchChanged', handleActiveBranchChanged);
    return () => window.removeEventListener('activeBranchChanged', handleActiveBranchChanged);
  }, [activeConfig.slug, searchQuery, secondaryFilter, startDate, endDate, gstSubTab, customerFilter]);

  useEffect(() => {
    setSearchQuery('');
    setSecondaryFilter('All');
    setCustomerFilter('All');
    loadReportData(activeConfig.slug, '', 'All', startDate, endDate, gstSubTab, 'All', selectedBranchId);
  }, [activeReportId, selectedBranchId]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadReportData(activeConfig.slug, val, secondaryFilter, startDate, endDate, gstSubTab, customerFilter);
  };

  const handleCustomerFilterChange = (val) => {
    setCustomerFilter(val);
    loadReportData(activeConfig.slug, searchQuery, secondaryFilter, startDate, endDate, gstSubTab, val);
  };

  // Quick Date Preset clicker
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
    } else if (preset === 'QUARTER') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      s = d.toISOString().split('T')[0];
      e = now.toISOString().split('T')[0];
    } else if (preset === 'ALL') {
      s = '';
      e = '';
    }

    setStartDate(s);
    setEndDate(e);
    loadReportData(activeConfig.slug, searchQuery, secondaryFilter, s, e, gstSubTab, customerFilter);
  };

  const handleManualFetch = () => {
    setDatePreset('CUSTOM');
    loadReportData(activeConfig.slug, searchQuery, secondaryFilter, startDate, endDate, gstSubTab, customerFilter);
    showToast(`Fetched ${activeConfig.label} for selected date range`);
  };

  const handleSecondaryFilterChange = (val) => {
    setSecondaryFilter(val);
    loadReportData(activeConfig.slug, searchQuery, val, startDate, endDate, gstSubTab, customerFilter);
  };

  const handleGstReturnModeChange = (mode) => {
    setGstReturnMode(mode);
    setGstSubTab('all');
  };

  const handleGstTabChange = (tab) => {
    setGstSubTab(tab);
    if (gstReturnMode === 'gstr1') {
      if (tab === 'b2b' || tab === 'b2c') {
        loadReportData('gst', searchQuery, secondaryFilter, startDate, endDate, tab, customerFilter);
      } else {
        loadReportData('gst', searchQuery, secondaryFilter, startDate, endDate, 'all', customerFilter);
      }
    }
  };

  // Export official GSTR-1 JSON schema for Government Offline Tool upload
  const handleExportGstJson = () => {
    try {
      if (!reportData?.gstr1) {
        showToast('No GSTR-1 data available to export.');
        return;
      }
      const g1 = reportData.gstr1;
      const gstr1Export = {
        gstin: reportData.compGstin || '32AABCS1429B1Z0',
        fp: startDate ? startDate.substring(0, 7).replace('-', '') : '102026',
        gt: g1.summary.totalInvoiceValue || 0,
        cur_gt: g1.summary.totalInvoiceValue || 0,
        b2b: (g1.b2b || []).map(inv => ({
          ctin: inv.customer_gstin,
          inv: [{
            inum: inv.invoice_number,
            idt: inv.invoice_date,
            val: parseFloat(inv.grand_total) || 0,
            pos: inv.state_code || '32',
            rchrg: 'N',
            inv_typ: 'R',
            itms: [{
              num: 1,
              itm_det: {
                txval: parseFloat(inv.taxable_value) || 0,
                rt: parseFloat(inv.total_tax) > 0 ? Math.round((parseFloat(inv.total_tax) / parseFloat(inv.taxable_value)) * 100) : 18,
                camt: parseFloat(inv.cgst_amount) || 0,
                samt: parseFloat(inv.sgst_amount) || 0,
                iamt: parseFloat(inv.igst_amount) || 0,
                csamt: 0
              }
            }]
          }]
        })),
        b2cs: (g1.b2c || []).map(inv => ({
          sply_ty: 'INTRA',
          pos: inv.state_code || '32',
          typ: 'OE',
          txval: parseFloat(inv.taxable_value) || 0,
          rt: 18,
          camt: parseFloat(inv.cgst_amount) || 0,
          samt: parseFloat(inv.sgst_amount) || 0,
          csamt: 0
        })),
        hsn: {
          data: (g1.hsnSummary || []).map((h, i) => ({
            num: i + 1,
            hsn_sc: h.hsn_code,
            desc: h.description,
            uqc: h.uqc,
            qty: parseFloat(h.total_qty) || 0,
            val: parseFloat(h.total_value) || 0,
            txval: parseFloat(h.taxable_value) || 0,
            iamt: parseFloat(h.igst_amount) || 0,
            camt: parseFloat(h.cgst_amount) || 0,
            samt: parseFloat(h.sgst_amount) || 0,
            csamt: 0
          }))
        },
        doc_issue: {
          doc_det: [{
            doc_num: 1,
            doc_typ: 'Invoices for outward supply',
            docs: [{
              num: 1,
              from: g1.docSummary?.fromSerial || 'INV-0001',
              to: g1.docSummary?.toSerial || 'INV-0001',
              totnum: g1.docSummary?.totalNumber || 0,
              canc: 0,
              net_issue: g1.docSummary?.netIssued || 0
            }]
          }]
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gstr1Export, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `GSTR1_${gstr1Export.fp}_Offline_Upload.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Downloaded GSTR-1 JSON for GST Portal Offline Tool!');
    } catch (err) {
      console.error('Failed to export GSTR-1 JSON:', err);
      showToast('Error exporting GSTR-1 JSON');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Export current report to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      if (!reportData) {
        showToast('No records available to export.');
        return;
      }

      const wb = XLSX.utils.book_new();

      if (activeConfig.id === 'customer-wise') {
        const customerRows = (reportData.data || []).map(r => ({
          'Invoice #': r.invoice_number,
          'Date': r.invoice_date,
          'Customer Name': r.customer_name,
          'Customer Code': r.customer_code || '',
          'Customer Phone': r.customer_phone || '',
          'Customer GSTIN': r.customer_gstin || 'Unregistered',
          'Salesman': r.salesman_name || 'Direct Order',
          'Taxable Value (₹)': parseFloat(r.taxable_value) || 0,
          'CGST (₹)': parseFloat(r.cgst_amount) || 0,
          'SGST (₹)': parseFloat(r.sgst_amount) || 0,
          'Total Tax (₹)': parseFloat(r.total_tax) || 0,
          'Grand Total (₹)': parseFloat(r.grand_total) || 0,
          'Paid Amount (₹)': parseFloat(r.paid_amount) || 0,
          'Balance Due (₹)': parseFloat(r.balance_due) || 0,
          'Payment Status': r.payment_status,
          'Payment Mode': r.payment_mode || 'Cash'
        }));
        const ws = XLSX.utils.json_to_sheet(customerRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Customer_Purchases');
      } else if (activeConfig.id === 'gst') {
        if (gstReturnMode === 'gstr1') {
          const g1 = reportData.gstr1 || {};
          const b2bRows = (g1.b2b || []).map(r => ({
            'Invoice #': r.invoice_number,
            'Date': r.invoice_date,
            'Customer Name': r.customer_name,
            'Customer GSTIN': r.customer_gstin,
            'State Code': r.state_code,
            'Taxable Value (₹)': parseFloat(r.taxable_value) || 0,
            'CGST (₹)': parseFloat(r.cgst_amount) || 0,
            'SGST (₹)': parseFloat(r.sgst_amount) || 0,
            'IGST (₹)': parseFloat(r.igst_amount) || 0,
            'Total Invoice Value (₹)': parseFloat(r.grand_total) || 0,
            'Payment Status': r.payment_status
          }));
          const wsB2B = XLSX.utils.json_to_sheet(b2bRows);
          XLSX.utils.book_append_sheet(wb, wsB2B, 'GSTR1_B2B');

          const b2cRows = (g1.b2c || []).map(r => ({
            'Invoice #': r.invoice_number,
            'Date': r.invoice_date,
            'Customer Name': r.customer_name,
            'State Code': r.state_code,
            'Taxable Value (₹)': parseFloat(r.taxable_value) || 0,
            'CGST (₹)': parseFloat(r.cgst_amount) || 0,
            'SGST (₹)': parseFloat(r.sgst_amount) || 0,
            'Total Invoice Value (₹)': parseFloat(r.grand_total) || 0,
            'Payment Mode': r.payment_mode
          }));
          const wsB2C = XLSX.utils.json_to_sheet(b2cRows);
          XLSX.utils.book_append_sheet(wb, wsB2C, 'GSTR1_B2C_Retail');

          if (g1.hsnSummary && g1.hsnSummary.length > 0) {
            const hsnRows = g1.hsnSummary.map(h => ({
              'HSN Code': h.hsn_code,
              'Description': h.description,
              'UQC': h.uqc,
              'Total Quantity': h.total_qty,
              'Taxable Value (₹)': h.taxable_value,
              'CGST (₹)': h.cgst_amount,
              'SGST (₹)': h.sgst_amount,
              'IGST (₹)': h.igst_amount,
              'Total Tax (₹)': (h.cgst_amount || 0) + (h.sgst_amount || 0) + (h.igst_amount || 0)
            }));
            const wsHsn = XLSX.utils.json_to_sheet(hsnRows);
            XLSX.utils.book_append_sheet(wb, wsHsn, 'GSTR1_HSN_Summary');
          }

          if (g1.docSummary) {
            const docRows = [{
              'Nature of Document': g1.docSummary.natureOfDoc,
              'From Serial #': g1.docSummary.fromSerial,
              'To Serial #': g1.docSummary.toSerial,
              'Total Number Issued': g1.docSummary.totalNumber,
              'Cancelled': g1.docSummary.cancelledNumber,
              'Net Issued': g1.docSummary.netIssued
            }];
            const wsDocs = XLSX.utils.json_to_sheet(docRows);
            XLSX.utils.book_append_sheet(wb, wsDocs, 'GSTR1_Docs_Summary');
          }
        } else if (gstReturnMode === 'gstr2') {
          const g2 = reportData.gstr2 || {};
          const inRows = (g2.data || []).map(r => ({
            'PO / Bill #': r.invoice_number,
            'Bill Date': r.invoice_date,
            'Supplier Company': r.vendor_name,
            'Supplier GSTIN': r.vendor_gstin,
            'Place of Supply': r.place_of_supply,
            'Supply Type': r.supply_type,
            'Taxable Value (₹)': parseFloat(r.taxable_value) || 0,
            'Input CGST (₹)': parseFloat(r.cgst_amount) || 0,
            'Input SGST (₹)': parseFloat(r.sgst_amount) || 0,
            'Input IGST (₹)': parseFloat(r.igst_amount) || 0,
            'Total Bill Amount (₹)': parseFloat(r.grand_total) || 0,
            'ITC Eligibility': r.itc_status,
            'ITC Category': r.itc_category
          }));
          const wsIn = XLSX.utils.json_to_sheet(inRows);
          XLSX.utils.book_append_sheet(wb, wsIn, 'GSTR2B_Inward_Purchases');

          if (g2.vendorSummary && g2.vendorSummary.length > 0) {
            const vRows = g2.vendorSummary.map(v => ({
              'Vendor Name': v.vendor_name,
              'GSTIN': v.vendor_gstin,
              'Bills Count': v.po_count,
              'Total Purchases (₹)': v.total_purchases,
              'Taxable Value (₹)': v.taxable_value,
              'CGST (₹)': v.cgst_amount,
              'SGST (₹)': v.sgst_amount,
              'IGST (₹)': v.igst_amount,
              'Total ITC Available (₹)': v.total_itc
            }));
            const wsV = XLSX.utils.json_to_sheet(vRows);
            XLSX.utils.book_append_sheet(wb, wsV, 'GSTR2B_Vendor_ITC_Summary');
          }
        } else if (gstReturnMode === 'gstr3b') {
          const g3b = reportData.gstr3b || {};
          const summRows = [{
            'Gross Output Tax Liability (₹)': g3b.summary?.totalOutputTax || 0,
            'Eligible Input Tax Credit / ITC (₹)': g3b.summary?.totalInputItc || 0,
            'ITC Utilized against Liability (₹)': g3b.summary?.totalItcUtilized || 0,
            'Net Cash Tax Payable (₹)': g3b.summary?.totalCashPayable || 0,
            'Closing ITC Credit Balance C/F (₹)': g3b.summary?.totalExcessItcBalance || 0,
            'Compliance Status': g3b.summary?.status || 'Compliant',
            'Filing Due Date': g3b.summary?.filingDueDate || '20th of the following month'
          }];
          const wsSumm = XLSX.utils.json_to_sheet(summRows);
          XLSX.utils.book_append_sheet(wb, wsSumm, 'GSTR3B_Executive_Summary');

          if (g3b.table31?.rows) {
            const t31Rows = g3b.table31.rows.map(r => ({
              'Nature of Supplies': r.nature,
              'Taxable Value (₹)': r.taxable_value,
              'Integrated Tax / IGST (₹)': r.igst,
              'Central Tax / CGST (₹)': r.cgst,
              'State/UT Tax / SGST (₹)': r.sgst,
              'Cess (₹)': r.cess
            }));
            const wsT31 = XLSX.utils.json_to_sheet(t31Rows);
            XLSX.utils.book_append_sheet(wb, wsT31, 'Table_3.1_Outward');
          }

          if (g3b.table4?.rows) {
            const t4Rows = g3b.table4.rows.map(r => ({
              'ITC Category': r.nature,
              'Integrated Tax / IGST (₹)': r.igst,
              'Central Tax / CGST (₹)': r.cgst,
              'State/UT Tax / SGST (₹)': r.sgst,
              'Cess (₹)': r.cess
            }));
            const wsT4 = XLSX.utils.json_to_sheet(t4Rows);
            XLSX.utils.book_append_sheet(wb, wsT4, 'Table_4_Eligible_ITC');
          }

          if (g3b.table61?.rows) {
            const t61Rows = g3b.table61.rows.map(r => ({
              'Tax Description': r.tax_type,
              'Total Tax Payable (₹)': r.total_tax_payable,
              'Paid through ITC (₹)': r.paid_through_itc,
              'Tax Payable in Cash (₹)': r.tax_payable_in_cash,
              'Balance ITC Carried Forward (₹)': r.balance_itc_cf
            }));
            const wsT61 = XLSX.utils.json_to_sheet(t61Rows);
            XLSX.utils.book_append_sheet(wb, wsT61, 'Table_6.1_Tax_Payment');
          }
        }
      } else if (activeConfig.id === 'ledger') {
        const ledgerRows = (reportData.data || []).map(r => ({
          'Date': r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('en-IN') : '',
          'Voucher / Ref #': r.reference_no,
          'Transaction Type': r.transaction_type,
          'Customer Name': r.customer_name,
          'Customer Code': r.customer_code || '',
          'Phone': r.customer_phone || '',
          'Place / City': r.customer_place || '',
          'Particulars': r.particulars || '',
          'Payment Mode': r.payment_mode || '',
          'Salesman': r.salesman_name || 'Direct / Head Office',
          'Debit Amount (₹)': parseFloat(r.debit) || 0,
          'Credit Amount (₹)': parseFloat(r.credit) || 0,
          'Running Balance (₹)': `${Math.abs(r.running_balance)} ${r.balance_type}`
        }));
        const ws = XLSX.utils.json_to_sheet(ledgerRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Customer_Ledger');
      } else if (activeConfig.id === 'expenses') {
        const expenseRows = (reportData.data || []).map(r => ({
          'Salesman': r.salesman_name,
          'Phone': r.phone || '',
          'Gross Cash Collected (₹)': r.total_cash_collected || 0,
          'Total Expenses (₹)': r.total_expenses || 0,
          'Net Cash In Hand (₹)': r.net_cash_inhand || 0,
          'Expense Receipts Count': r.expense_count || 0,
          'Fuel Spend (₹)': (r.categories?.['Fuel / Diesel'] || 0) + (r.categories?.['Fuel'] || 0),
          'Food Spend (₹)': (r.categories?.['Food & Meals'] || 0) + (r.categories?.['Food'] || 0),
          'Handover Status': r.status === 'Settled' ? 'Settled' : (r.net_cash_inhand > 0 ? 'Cash to Handover' : 'Settled')
        }));
        const ws = XLSX.utils.json_to_sheet(expenseRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Expenses_Report');
      } else {
        if (!reportData.data || reportData.data.length === 0) {
          showToast('No records available to export.');
          return;
        }
        const ws = XLSX.utils.json_to_sheet(reportData.data);
        XLSX.utils.book_append_sheet(wb, ws, activeConfig.label.slice(0, 31));
      }

      const filename = `${activeConfig.label.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast(`Exported ${activeConfig.label} report to Excel!`);
    } catch (err) {
      console.error('Export Excel failed:', err);
      showToast('Export failed. Please check table data.');
    }
  };

  // Direct Print
  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="reports-hub-root">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="reports-toast-banner">
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="reports-header-card print-hidden">
        <div className="reports-header-left">
          <div className="reports-header-icon-wrap" style={{ backgroundColor: `${activeConfig.color}15`, color: activeConfig.color }}>
            <activeConfig.icon size={26} />
          </div>
          <div>
            <div className="reports-title-row">
              <h1 className="reports-page-title">Reports & Business Intelligence</h1>
              <span className="reports-hub-badge">Enterprise Edition</span>
            </div>
            <p className="reports-page-subtitle">
              Audited financials, live warehouse & van stock, customer receivables, and vendor payable statements.
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="reports-header-actions">
          <button 
            className="rep-action-btn rep-btn-excel"
            onClick={handleExportExcel}
            title="Download formatted Excel (.xlsx) sheet"
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>
          {activeConfig.id === 'gst' && gstReturnMode === 'gstr1' && (
            <button 
              className="rep-action-btn"
              style={{ background: '#0d9488', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleExportGstJson}
              title="Download official JSON for GST Offline Tool upload"
            >
              <Download size={15} />
              <span>GSTR-1 JSON</span>
            </button>
          )}
          <button 
            className="rep-action-btn rep-btn-print"
            onClick={handlePrint}
            title="Print or save as PDF"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>
          <button 
            className="rep-action-btn rep-btn-refresh"
            onClick={() => {
              loadMasterMetrics();
              loadReportData(activeConfig.slug);
              showToast('Refreshed report metrics!');
            }}
            title="Refresh latest data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Master KPI Metric Strip (High-Level Snapshot across whole system) */}
      <div className="reports-kpi-grid print-hidden">
        <div className="rep-kpi-card border-blue">
          <div className="rep-kpi-top">
            <span className="rep-kpi-label">Total Collections</span>
            <div className="rep-kpi-icon-badge bg-blue"><DollarSign size={17} color="#2563eb" /></div>
          </div>
          <div className="rep-kpi-value">{formatCurrency(summaryMetrics?.totalCollections || 0)}</div>
          <div className="rep-kpi-hint positive">
            <TrendingUp size={13} />
            <span>Real-time customer payments</span>
          </div>
        </div>

        <div className="rep-kpi-card border-amber">
          <div className="rep-kpi-top">
            <span className="rep-kpi-label">Customer Outstanding</span>
            <div className="rep-kpi-icon-badge bg-amber"><Clock size={17} color="#d97706" /></div>
          </div>
          <div className="rep-kpi-value">{formatCurrency(summaryMetrics?.totalOutstanding || 0)}</div>
          <div className="rep-kpi-hint warning">
            <Clock size={13} />
            <span>Pending receivables balance</span>
          </div>
        </div>

        <div className="rep-kpi-card border-emerald">
          <div className="rep-kpi-top">
            <span className="rep-kpi-label">Total Stock Valuation</span>
            <div className="rep-kpi-icon-badge bg-emerald"><Boxes size={17} color="#059669" /></div>
          </div>
          <div className="rep-kpi-value">{formatCurrency(summaryMetrics?.totalStockValuation || 0)}</div>
          <div className="rep-kpi-hint positive">
            <Warehouse size={13} />
            <span>Warehouse + Van transit</span>
          </div>
        </div>

        {canAccessVendors && (
          <div className="rep-kpi-card border-purple">
            <div className="rep-kpi-top">
              <span className="rep-kpi-label">Vendor Payables</span>
              <div className="rep-kpi-icon-badge bg-purple"><Receipt size={17} color="#7c3aed" /></div>
            </div>
            <div className="rep-kpi-value">{formatCurrency(summaryMetrics?.vendorPayables || 0)}</div>
            <div className="rep-kpi-hint neutral">
              <Building size={13} />
              <span>Outstanding supplier balance</span>
            </div>
          </div>
        )}

        <div className="rep-kpi-card border-red">
          <div className="rep-kpi-top">
            <span className="rep-kpi-label">Damaged Stock Loss</span>
            <div className="rep-kpi-icon-badge bg-red"><AlertOctagon size={17} color="#dc2626" /></div>
          </div>
          <div className="rep-kpi-value">{formatCurrency(summaryMetrics?.damagedLossValuation || 0)}</div>
          <div className="rep-kpi-hint danger">
            <ShieldAlert size={13} />
            <span>Transit & handling scrap</span>
          </div>
        </div>
      </div>

      {/* Reports Tab Switcher Bar in 2 Clean Rows (No Scrolling Required) */}
      <div className="reports-nav-tabs-wrapper print-hidden">
        {(() => {
          const totalTabs = allowedReportConfigs.length;
          const isMultiRow = totalTabs > 5;
          const splitIndex = isMultiRow ? Math.ceil(totalTabs / 2) : totalTabs;
          const row1Tabs = allowedReportConfigs.slice(0, splitIndex);
          const row2Tabs = isMultiRow ? allowedReportConfigs.slice(splitIndex) : [];

          return (
            <div className="reports-nav-tabs-rows-container">
              <div className="reports-nav-tabs-row">
                {row1Tabs.map((rep, idx) => {
                  const Icon = rep.icon;
                  const isActive = activeReportId === rep.id;
                  return (
                    <button
                      key={rep.id}
                      className={`reports-tab-pill ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveReportId(rep.id)}
                      title={rep.fullTitle || rep.label}
                      style={isActive ? { borderBottomColor: rep.color } : {}}
                    >
                      <span className="rep-pill-num">{idx + 1}</span>
                      <Icon size={14} className="rep-pill-icon" style={{ color: isActive ? rep.color : '#64748b' }} />
                      <span className="rep-pill-text">{rep.label}</span>
                    </button>
                  );
                })}
              </div>

              {row2Tabs.length > 0 && (
                <div className="reports-nav-tabs-row">
                  {row2Tabs.map((rep, idx) => {
                    const Icon = rep.icon;
                    const actualIdx = splitIndex + idx;
                    const isActive = activeReportId === rep.id;
                    return (
                      <button
                        key={rep.id}
                        className={`reports-tab-pill ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveReportId(rep.id)}
                        title={rep.fullTitle || rep.label}
                        style={isActive ? { borderBottomColor: rep.color } : {}}
                      >
                        <span className="rep-pill-num">{actualIdx + 1}</span>
                        <Icon size={14} className="rep-pill-icon" style={{ color: isActive ? rep.color : '#64748b' }} />
                        <span className="rep-pill-text">{rep.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Main Active Report Workspace */}
      <div className="active-report-container">
        {/* Active Report Header & Secondary Filters */}
        <div className="active-report-bar print-hidden">
          <div className="active-report-title-area">
            <div className="report-badge-pill" style={{ backgroundColor: `${activeConfig.color}15`, color: activeConfig.color }}>
              {activeConfig.badge}
            </div>
            <h2 className="active-report-name">{activeConfig.fullTitle}</h2>
          </div>

          {/* Filter Tools */}
          <div className="active-report-filters">
            {/* Search Filter */}
            <div className="rep-search-wrap">
              <Search size={15} className="rep-search-icon" />
              <input
                type="text"
                placeholder={`Search in ${activeConfig.label}...`}
                className="rep-search-input"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>

            {/* From & To Date Range Filter with Fetch Button */}
            <div className="rep-custom-date-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                <Calendar size={14} color="#64748b" />
                <span>From:</span>
                <input
                  type="date"
                  className="rep-date-input"
                  style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span>To:</span>
                <input
                  type="date"
                  className="rep-date-input"
                  style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <button
                  type="button"
                  style={{ padding: '5px 12px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={handleManualFetch}
                  title="Fetch report for selected date range"
                >
                  Fetch
                </button>
              </div>

              {/* Quick Preset Chips */}
              <div className="rep-date-selector">
                <button 
                  className={`rep-date-chip ${datePreset === 'ALL' ? 'active' : ''}`}
                  onClick={() => handleDatePresetClick('ALL')}
                >
                  All Time
                </button>
                <button 
                  className={`rep-date-chip ${datePreset === 'TODAY' ? 'active' : ''}`}
                  onClick={() => handleDatePresetClick('TODAY')}
                >
                  Today
                </button>
                <button 
                  className={`rep-date-chip ${datePreset === 'WEEK' ? 'active' : ''}`}
                  onClick={() => handleDatePresetClick('WEEK')}
                >
                  7 Days
                </button>
                <button 
                  className={`rep-date-chip ${datePreset === 'MONTH' ? 'active' : ''}`}
                  onClick={() => handleDatePresetClick('MONTH')}
                >
                  30 Days
                </button>
                <button 
                  className={`rep-date-chip ${datePreset === 'QUARTER' ? 'active' : ''}`}
                  onClick={() => handleDatePresetClick('QUARTER')}
                >
                  Quarter
                </button>
              </div>
            </div>

            {/* GST Sub-Tab Filters (GSTR-1, GSTR-2B, GSTR-3B) */}
            {activeConfig.id === 'gst' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '6px' }}>
                {/* Primary Return Mode Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div className="gst-return-switcher">
                    <button 
                      type="button"
                      className={`gst-return-btn ${gstReturnMode === 'gstr1' ? 'active' : ''}`}
                      onClick={() => handleGstReturnModeChange('gstr1')}
                    >
                      <span>GSTR-1</span>
                      <small style={{ fontSize: '10.5px', opacity: 0.8 }}>(Sales / Outward)</small>
                    </button>
                    <button 
                      type="button"
                      className={`gst-return-btn ${gstReturnMode === 'gstr2' ? 'active' : ''}`}
                      onClick={() => handleGstReturnModeChange('gstr2')}
                    >
                      <span>GSTR-2B</span>
                      <small style={{ fontSize: '10.5px', opacity: 0.8 }}>(Inward Purchases &amp; ITC)</small>
                    </button>
                    <button 
                      type="button"
                      className={`gst-return-btn ${gstReturnMode === 'gstr3b' ? 'active' : ''}`}
                      onClick={() => handleGstReturnModeChange('gstr3b')}
                    >
                      <span>GSTR-3B</span>
                      <small style={{ fontSize: '10.5px', opacity: 0.8 }}>(Monthly Summary Return)</small>
                    </button>
                  </div>

                  {/* Company GSTIN & Compliance pill */}
                  <div className="gst-info-pill">
                    <span>GSTIN: <strong className="font-mono">{reportData?.compGstin || '32AABCS1429B1Z0'}</strong></span>
                    <span style={{ color: '#94a3b8' }}>•</span>
                    <span>State: <strong>{reportData?.compStateCode || '32'} (Kerala)</strong></span>
                  </div>
                </div>

                {/* Contextual Sub-Filters for Selected Return */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {gstReturnMode === 'gstr1' && (
                    <>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'all' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('all')}
                      >
                        All Sales Invoices
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'b2b' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('b2b')}
                      >
                        B2B (Registered)
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'b2c' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('b2c')}
                      >
                        B2C (Retail)
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'hsn' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('hsn')}
                      >
                        Table 12: HSN Summary
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'docs' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('docs')}
                      >
                        Table 13: Docs Issued
                      </button>
                    </>
                  )}

                  {gstReturnMode === 'gstr2' && (
                    <>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'all' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('all')}
                      >
                        All Inward Purchases
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'b2b' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('b2b')}
                      >
                        Eligible ITC (B2B Purchases)
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'vendor' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('vendor')}
                      >
                        Vendor ITC Summary
                      </button>
                    </>
                  )}

                  {gstReturnMode === 'gstr3b' && (
                    <>
                      <button 
                        className={`rep-date-chip ${gstSubTab === 'all' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('all')}
                      >
                        Complete GSTR-3B Return
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === '3.1' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('3.1')}
                      >
                        Table 3.1 (Outward Supplies)
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === '4' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('4')}
                      >
                        Table 4 (Eligible ITC)
                      </button>
                      <button 
                        className={`rep-date-chip ${gstSubTab === '6.1' ? 'active' : ''}`}
                        onClick={() => handleGstTabChange('6.1')}
                      >
                        Table 6.1 (Tax Payment in Cash)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contextual Secondary Filter */}
            {activeConfig.id === 'payments' && (
              <select 
                className="rep-select-dropdown"
                value={secondaryFilter}
                onChange={(e) => handleSecondaryFilterChange(e.target.value)}
              >
                <option value="All">All Modes</option>
                <option value="Cash">Cash Only</option>
                <option value="UPI">UPI Only</option>
                <option value="Cheque">Cheque Only</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            )}

            {activeConfig.id === 'damaged-products' && (
              <select 
                className="rep-select-dropdown"
                value={secondaryFilter}
                onChange={(e) => handleSecondaryFilterChange(e.target.value)}
              >
                <option value="All">All Reasons</option>
                <option value="Transit Leakage">Transit Leakage</option>
                <option value="Moisture Ingress">Moisture Ingress</option>
                <option value="Handling Breakage">Handling Breakage</option>
              </select>
            )}

            {/* Contextual Filter for Customer Wise Report */}
            {activeConfig.id === 'customer-wise' && (
              <>
                <select 
                  className="rep-select-dropdown"
                  value={customerFilter}
                  onChange={(e) => handleCustomerFilterChange(e.target.value)}
                  style={{ minWidth: '220px', fontWeight: 600, color: '#0f172a' }}
                >
                  <option value="All">All Customers (Consolidated)</option>
                  {customersList.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.name} {c.customer_code ? `(${c.customer_code})` : ''}
                    </option>
                  ))}
                </select>

                <select 
                  className="rep-select-dropdown"
                  value={secondaryFilter}
                  onChange={(e) => handleSecondaryFilterChange(e.target.value)}
                >
                  <option value="All">All Payment Statuses</option>
                  <option value="Paid">Paid Only</option>
                  <option value="Partial">Partial Dues</option>
                  <option value="Unpaid">Unpaid Only</option>
                </select>
              </>
            )}

            {/* Contextual Filter for Customer Ledger Report */}
            {activeConfig.id === 'ledger' && (
              <>
                <select 
                  className="rep-select-dropdown"
                  value={customerFilter}
                  onChange={(e) => handleCustomerFilterChange(e.target.value)}
                  style={{ minWidth: '220px', fontWeight: 600, color: '#0f172a' }}
                >
                  <option value="All">All Customers (Consolidated Ledger)</option>
                  {customersList.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.name} {c.customer_code ? `(${c.customer_code})` : ''}
                    </option>
                  ))}
                </select>

                <select 
                  className="rep-select-dropdown"
                  value={secondaryFilter}
                  onChange={(e) => handleSecondaryFilterChange(e.target.value)}
                >
                  <option value="All">All Transaction Types</option>
                  <option value="INVOICE">Invoices Only (Debits)</option>
                  <option value="PAYMENT">Payments Only (Credits)</option>
                  <option value="CREDIT_NOTE">Credit Notes Only</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Printable Formal Header with Company Logo */}
        <div className="print-only formal-report-header">
          <div className="formal-report-brand-wrap">
            {companySettings?.logo_url && (
              <img 
                src={companySettings.logo_url} 
                alt="Company Logo" 
                className="formal-report-logo" 
              />
            )}
            <div className="formal-report-titles">
              <h2 className="formal-report-company">{companySettings?.legal_name || companySettings?.company_name || ''}</h2>
              <p className="formal-report-sub">
                {companySettings?.address_line1 || companySettings?.address || ''}
                {companySettings?.gstin ? ` | GSTIN: ${companySettings.gstin}` : ''}
                {companySettings?.phone ? ` | Phone: ${companySettings.phone}` : ''}
              </p>
              <h3 className="formal-report-doc-title">{activeConfig.fullTitle}</h3>
              <p className="formal-report-meta">
                Generated on: {new Date().toLocaleString()} | Period: {startDate && endDate ? `${startDate} to ${endDate}` : (datePreset || 'All Time')}
                {(activeConfig.id === 'customer-wise' || activeConfig.id === 'ledger') && customerFilter !== 'All' && (
                  <> | Customer: {customersList.find(c => String(c.customer_id) === String(customerFilter))?.name || customerFilter}</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Metric Strip for Active Report */}
        {reportData?.summary && (
          <div className="active-report-summary-ribbon print-hidden">
            <div className="ribbon-metric-item">
              <span className="ribbon-label">Total Records</span>
              <strong className="ribbon-val">{reportData.totalRecords || 0}</strong>
            </div>

            {reportData.summary.totalAmount !== undefined && (
              <div className="ribbon-metric-item">
                <span className="ribbon-label">Total Payment Amount</span>
                <strong className="ribbon-val text-blue">{formatCurrency(reportData.summary.totalAmount)}</strong>
              </div>
            )}

            {reportData.summary.totalOutstanding !== undefined && (
              <div className="ribbon-metric-item">
                <span className="ribbon-label">Total Receivables Outstanding</span>
                <strong className="ribbon-val text-amber">{formatCurrency(reportData.summary.totalOutstanding)}</strong>
              </div>
            )}

            {reportData.summary.totalValuation !== undefined && (
              <div className="ribbon-metric-item">
                <span className="ribbon-label">Total Inventory Valuation</span>
                <strong className="ribbon-val text-emerald">{formatCurrency(reportData.summary.totalValuation)}</strong>
              </div>
            )}

            {reportData.summary.totalCollected !== undefined && (
              <div className="ribbon-metric-item">
                <span className="ribbon-label">Total Collected Revenue</span>
                <strong className="ribbon-val text-purple">{formatCurrency(reportData.summary.totalCollected)}</strong>
              </div>
            )}

            {reportData.summary.totalPending !== undefined && (
              <div className="ribbon-metric-item">
                <span className="ribbon-label">Pending Inward Receipts</span>
                <strong className="ribbon-val text-orange">{formatCurrency(reportData.summary.totalPending)}</strong>
              </div>
            )}

            {reportData.summary.totalLossValuation !== undefined && (
              <div className="ribbon-metric-item">
                <span className="ribbon-label">Total Damaged Scrap Loss</span>
                <strong className="ribbon-val text-red">{formatCurrency(reportData.summary.totalLossValuation)}</strong>
              </div>
            )}

            {reportData.summary.grandPendingPayable !== undefined && (
              <div className="ribbon-metric-item">
                <span className="ribbon-label">Net Vendor Payables</span>
                <strong className="ribbon-val text-purple">{formatCurrency(reportData.summary.grandPendingPayable)}</strong>
              </div>
            )}

            {activeConfig.id === 'customer-wise' && reportData.summary.totalBilled !== undefined && (
              <>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Total Purchases / Billed</span>
                  <strong className="ribbon-val text-blue">{formatCurrency(reportData.summary.totalBilled)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Taxable Value</span>
                  <strong className="ribbon-val text-emerald">{formatCurrency(reportData.summary.totalTaxable)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">GST Tax Collected</span>
                  <strong className="ribbon-val text-purple">{formatCurrency(reportData.summary.totalTax)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Amount Paid</span>
                  <strong className="ribbon-val text-emerald">{formatCurrency(reportData.summary.totalPaid)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Balance Outstanding</span>
                  <strong className={`ribbon-val ${reportData.summary.totalBalance > 0 ? 'text-red' : 'text-emerald'}`}>
                    {formatCurrency(reportData.summary.totalBalance)}
                  </strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Average Order Size</span>
                  <strong className="ribbon-val">{formatCurrency(reportData.summary.averageOrder)}</strong>
                </div>
              </>
            )}

            {activeConfig.id === 'ledger' && reportData.summary && (
              <>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Total Debits (Billed)</span>
                  <strong className="ribbon-val text-blue">{formatCurrency(reportData.summary.totalDebit || 0)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Total Credits (Paid/Adjusted)</span>
                  <strong className="ribbon-val text-emerald">{formatCurrency(reportData.summary.totalCredit || 0)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Net Closing Balance</span>
                  <strong className={`ribbon-val ${(reportData.summary.netBalance || 0) > 0 ? 'text-amber' : 'text-emerald'}`}>
                    {formatCurrency(Math.abs(reportData.summary.netBalance || 0))} {reportData.summary.balanceType || ((reportData.summary.netBalance || 0) >= 0 ? 'Dr' : 'Cr')}
                  </strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Account Position</span>
                  <strong className="ribbon-val">
                    {(reportData.summary.netBalance || 0) > 0 ? 'Receivable Balance (Dr)' : (reportData.summary.netBalance || 0) < 0 ? 'Customer Advance (Cr)' : 'Settled / Zero Balance'}
                  </strong>
                </div>
              </>
            )}

            {activeConfig.id === 'gst' && (
              <>
                {gstReturnMode === 'gstr1' && (
                  <>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Total Outward Turnover</span>
                      <strong className="ribbon-val text-blue">{formatCurrency(reportData.gstr1?.summary?.totalInvoiceValue || reportData.summary?.totalInvoiceValue)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Taxable Sales Value</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr1?.summary?.totalTaxable || reportData.summary?.totalTaxable)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">CGST Output</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr1?.summary?.totalCgst || reportData.summary?.totalCgst)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">SGST Output</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr1?.summary?.totalSgst || reportData.summary?.totalSgst)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">IGST Output</span>
                      <strong className="ribbon-val text-blue">{formatCurrency(reportData.gstr1?.summary?.totalIgst || reportData.summary?.totalIgst)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Total Output Tax</span>
                      <strong className="ribbon-val text-purple">{formatCurrency(reportData.gstr1?.summary?.totalTax || reportData.summary?.totalTax)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">B2B / B2C Invoices</span>
                      <strong className="ribbon-val">{reportData.gstr1?.summary?.b2bCount || 0} B2B / {reportData.gstr1?.summary?.b2cCount || 0} B2C</strong>
                    </div>
                  </>
                )}

                {gstReturnMode === 'gstr2' && (
                  <>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Total Inward Purchases</span>
                      <strong className="ribbon-val text-blue">{formatCurrency(reportData.gstr2?.summary?.totalPurchaseValue || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Inward Taxable Value</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr2?.summary?.totalTaxable || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Input CGST Credit</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr2?.summary?.totalCgst || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Input SGST Credit</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr2?.summary?.totalSgst || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Input IGST Credit</span>
                      <strong className="ribbon-val text-blue">{formatCurrency(reportData.gstr2?.summary?.totalIgst || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Total Eligible ITC</span>
                      <strong className="ribbon-val text-purple">{formatCurrency(reportData.gstr2?.summary?.eligibleItc || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Supplier Bills / Vendors</span>
                      <strong className="ribbon-val">{reportData.gstr2?.summary?.totalBills || 0} bills / {reportData.gstr2?.summary?.vendorCount || 0} vendors</strong>
                    </div>
                  </>
                )}

                {gstReturnMode === 'gstr3b' && (
                  <>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Output Tax Liability</span>
                      <strong className="ribbon-val text-purple">{formatCurrency(reportData.gstr3b?.summary?.totalOutputTax || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Eligible Input Credit (ITC)</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr3b?.summary?.totalInputItc || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">ITC Utilized (Rule 88A)</span>
                      <strong className="ribbon-val text-blue">{formatCurrency(reportData.gstr3b?.summary?.totalItcUtilized || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Net Tax Payable (Cash)</span>
                      <strong className={`ribbon-val ${(reportData.gstr3b?.summary?.totalCashPayable || 0) > 0 ? 'text-red' : 'text-emerald'}`}>
                        {formatCurrency(reportData.gstr3b?.summary?.totalCashPayable || 0)}
                      </strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Excess ITC Balance C/F</span>
                      <strong className="ribbon-val text-emerald">{formatCurrency(reportData.gstr3b?.summary?.totalExcessItcBalance || 0)}</strong>
                    </div>
                    <div className="ribbon-metric-item">
                      <span className="ribbon-label">Statutory Due Date</span>
                      <strong className="ribbon-val text-orange">{reportData.gstr3b?.summary?.filingDueDate || '20th of month'}</strong>
                    </div>
                  </>
                )}
              </>
            )}

            {activeConfig.id === 'expenses' && (
              <>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Gross Cash Collected</span>
                  <strong className="ribbon-val text-blue">{formatCurrency(reportData.summary.totalCashCollected)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Total Expenses Deducted</span>
                  <strong className="ribbon-val text-red">-{formatCurrency(reportData.summary.totalExpenses)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Net Cash In-Hand to Deposit</span>
                  <strong className="ribbon-val text-emerald">{formatCurrency(reportData.summary.netInHandCash)}</strong>
                </div>
                <div className="ribbon-metric-item">
                  <span className="ribbon-label">Total Field Receipts</span>
                  <strong className="ribbon-val">{reportData.summary.totalCount} receipts</strong>
                </div>
              </>
            )}
          </div>
        )}

        {/* Dynamic Report Content Table */}
        <div className="report-table-card">
          {loading ? (
            <div className="rep-loading-state">
              <div className="rep-spinner"></div>
              <span>Compiling live {activeConfig.label} data...</span>
            </div>
          ) : !reportData || (activeConfig.id === 'gst' 
              ? (gstReturnMode === 'gstr3b'
                  ? !reportData.gstr3b
                  : (gstReturnMode === 'gstr2'
                      ? (gstSubTab === 'vendor' ? (!reportData.gstr2?.vendorSummary || reportData.gstr2.vendorSummary.length === 0) : (!reportData.gstr2?.data || reportData.gstr2.data.length === 0))
                      : (gstSubTab === 'hsn' 
                          ? (!reportData.gstr1?.hsnSummary || reportData.gstr1.hsnSummary.length === 0)
                          : (gstSubTab === 'docs' 
                              ? !reportData.gstr1?.docSummary 
                              : (!reportData.gstr1?.data || reportData.gstr1.data.length === 0))
                        )
                    )
                )
              : (!reportData.data || reportData.data.length === 0)) ? (
            <div className="rep-empty-state">
              <AlertCirclePlaceholder icon={activeConfig.icon} />
              <h3>No records found for {activeConfig.label}</h3>
              <p>Try modifying your search query or clearing the date filter.</p>
            </div>
          ) : (
            <div className="rep-table-responsive">
              <table className="rep-data-table">
                {/* 1. PAYMENTS TABLE */}
                {activeConfig.id === 'payments' && (
                  <>
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Date</th>
                        <th>Customer Name</th>
                        <th>Location</th>
                        <th>Sales Executive</th>
                        <th>Payment Mode</th>
                        <th>Txn / Ref No</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-primary">{r.payment_number}</td>
                          <td>{r.payment_date}</td>
                          <td>
                            <strong>{r.customer_name}</strong>
                            {r.customer_phone && <small className="cell-subtext">{r.customer_phone}</small>}
                          </td>
                          <td>{r.customer_place || '-'}</td>
                          <td>{r.salesman_name || 'Corporate Office'}</td>
                          <td>
                            <span className={`mode-badge mode-${(r.payment_mode || '').toLowerCase().replace(/\s+/g, '-')}`}>
                              {r.payment_mode}
                            </span>
                          </td>
                          <td className="font-mono text-muted">{r.reference_no || '-'}</td>
                          <td className="font-semibold text-right text-emerald">{formatCurrency(r.amount)}</td>
                          <td>
                            <span className="status-pill status-success">{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 2. OUTSTANDING REPORT */}
                {activeConfig.id === 'outstanding' && (
                  <>
                    <thead>
                      <tr>
                        <th>Cust Code</th>
                        <th>Customer / Store</th>
                        <th>Route / Beat</th>
                        <th>Credit Limit</th>
                        <th>Credit Days</th>
                        <th>Total Outstanding</th>
                        <th>0-30 Days</th>
                        <th>31-60 Days</th>
                        <th>60+ Days</th>
                        <th>Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td className="font-mono">{r.customer_code}</td>
                          <td>
                            <strong>{r.name}</strong>
                            <small className="cell-subtext">{r.place} • {r.phone}</small>
                          </td>
                          <td>{r.route_area || 'Central Distribution'}</td>
                          <td>{formatCurrency(r.credit_limit)}</td>
                          <td>{r.credit_days} days</td>
                          <td className="font-semibold text-right text-amber">{formatCurrency(r.outstanding_balance)}</td>
                          <td className="text-right">{formatCurrency(r.bucket_0_30)}</td>
                          <td className="text-right text-amber">{formatCurrency(r.bucket_31_60)}</td>
                          <td className="text-right text-red font-semibold">{formatCurrency(r.bucket_60_plus)}</td>
                          <td>
                            <span className={`status-pill ${r.risk_level === 'High' ? 'status-danger' : r.risk_level === 'Medium' ? 'status-warning' : 'status-success'}`}>
                              {r.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 3. TOTAL STOCKS REPORT */}
                {activeConfig.id === 'total-stocks' && (
                  <>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Description</th>
                        <th>Category</th>
                        <th>Wh Stock Units</th>
                        <th>Van Transit Units</th>
                        <th>Total Available</th>
                        <th>Unit Cost</th>
                        <th>Valuation (Cost)</th>
                        <th>Valuation (Retail)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td className="font-mono">{r.sku}</td>
                          <td><strong>{r.name}</strong></td>
                          <td><span className="cat-pill">{r.category_name}</span></td>
                          <td className="text-right">{parseFloat(r.warehouse_stock_units).toLocaleString()}</td>
                          <td className="text-right text-blue">{parseFloat(r.van_transit_stock_units).toLocaleString()}</td>
                          <td className="text-right font-bold text-primary">{parseFloat(r.total_available_units).toLocaleString()}</td>
                          <td className="text-right">{formatCurrency(r.buy_price)}</td>
                          <td className="text-right font-semibold text-emerald">{formatCurrency(r.valuation_cost)}</td>
                          <td className="text-right font-semibold text-purple">{formatCurrency(r.valuation_retail)}</td>
                          <td>
                            <span className={`status-pill ${r.stock_status === 'Healthy' ? 'status-success' : 'status-warning'}`}>
                              {r.stock_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 4. TOTAL COLLECTION REPORT */}
                {activeConfig.id === 'collections' && (
                  <>
                    <thead>
                      <tr>
                        <th>Collection Date</th>
                        <th>Receipts Count</th>
                        <th>Cash Collected</th>
                        <th>UPI Collected</th>
                        <th>Cheque Cleared</th>
                        <th>Bank / NEFT</th>
                        <th>Total Day Collection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td className="font-semibold">{r.payment_date}</td>
                          <td><span className="count-pill">{r.transaction_count} txns</span></td>
                          <td className="text-right text-emerald">{formatCurrency(r.cash_amount)}</td>
                          <td className="text-right text-blue">{formatCurrency(r.upi_amount)}</td>
                          <td className="text-right text-amber">{formatCurrency(r.cheque_amount)}</td>
                          <td className="text-right text-purple">{formatCurrency(r.bank_amount)}</td>
                          <td className="text-right font-bold text-primary">{formatCurrency(r.total_day_collection)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 5. PENDING PAYMENTS REPORT */}
                {activeConfig.id === 'pending-payments' && (
                  <>
                    <thead>
                      <tr>
                        <th>Order / Booking #</th>
                        <th>Customer</th>
                        <th>Product & Qty</th>
                        <th>Sales Executive</th>
                        <th>Total Billed</th>
                        <th>Advance Received</th>
                        <th>Pending Balance</th>
                        <th>Days Pending</th>
                        <th>Urgency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td className="font-mono text-primary font-semibold">{r.reference_no}</td>
                          <td>
                            <strong>{r.customer_name}</strong>
                            <small className="cell-subtext">{r.customer_place} • {r.customer_phone}</small>
                          </td>
                          <td>{r.product_name} ({parseFloat(r.total_qty).toLocaleString()} units)</td>
                          <td>{r.salesman_name || 'Unassigned'}</td>
                          <td className="text-right">{formatCurrency(r.total_amount)}</td>
                          <td className="text-right text-emerald">{formatCurrency(r.advance_amount)}</td>
                          <td className="text-right font-bold text-red">{formatCurrency(r.pending_amount)}</td>
                          <td>{r.days_pending} days</td>
                          <td>
                            <span className={`status-pill ${r.urgency === 'Overdue' ? 'status-danger' : 'status-warning'}`}>
                              {r.urgency}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 6. WAREHOUSE WISE STOCK REPORT */}
                {activeConfig.id === 'warehouse-stock' && (
                  <>
                    <thead>
                      <tr>
                        <th>Warehouse Depot</th>
                        <th>Location</th>
                        <th>Manager</th>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Batch / Bay</th>
                        <th>On Hand Qty</th>
                        <th>Reserved Qty</th>
                        <th>Net Available</th>
                        <th>Depot Valuation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.warehouse_name}</strong> ({r.warehouse_code})</td>
                          <td className="cell-subtext">{r.warehouse_location}</td>
                          <td>{r.manager_name}</td>
                          <td className="font-mono">{r.product_sku}</td>
                          <td><strong>{r.product_name}</strong></td>
                          <td><span className="tag-pill">{r.batch_no} • {r.bay_location}</span></td>
                          <td className="text-right font-semibold">{parseFloat(r.quantity).toLocaleString()}</td>
                          <td className="text-right text-amber">{parseFloat(r.reserved_quantity).toLocaleString()}</td>
                          <td className="text-right font-bold text-emerald">{parseFloat(r.available_quantity).toLocaleString()}</td>
                          <td className="text-right font-semibold text-primary">{formatCurrency(r.valuation)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 7. SALESMAN WISE STOCK REPORT */}
                {activeConfig.id === 'salesman-stock' && (
                  <>
                    <thead>
                      <tr>
                        <th>Sales Executive</th>
                        <th>Assigned Vehicle</th>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Package Type</th>
                        <th>Loaded Van Qty</th>
                        <th>Unit Cost</th>
                        <th>Total Van Stock Value</th>
                        <th>Van Allocation Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{r.salesman_name}</strong>
                            {r.salesman_phone && <small className="cell-subtext">{r.salesman_phone}</small>}
                          </td>
                          <td>
                            <span className="vehicle-pill">
                              <Truck size={13} />
                              {r.vehicle_reg_no || 'Unassigned'}
                            </span>
                          </td>
                          <td><strong>{r.product_name}</strong></td>
                          <td className="font-mono">{r.product_sku}</td>
                          <td>{r.package_type}</td>
                          <td className="text-right font-bold text-primary">{parseFloat(r.loaded_qty).toLocaleString()}</td>
                          <td className="text-right">{formatCurrency(r.unit_cost)}</td>
                          <td className="text-right font-bold text-emerald">{formatCurrency(r.total_value)}</td>
                          <td>
                            <span className="status-pill status-success">{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 8. SALESMAN WISE COLLECTIONS REPORT */}
                {activeConfig.id === 'salesman-collections' && (
                  <>
                    <thead>
                      <tr>
                        <th>Sales Executive</th>
                        <th>Contact</th>
                        <th>Receipts Count</th>
                        <th>Cash Collected</th>
                        <th>UPI Collected</th>
                        <th>Cheque Collected</th>
                        <th>Bank / NEFT</th>
                        <th>Total Field Collection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.salesman_name}</strong></td>
                          <td>{r.salesman_phone || '-'}</td>
                          <td><span className="count-pill">{r.total_collections_count} receipts</span></td>
                          <td className="text-right text-emerald font-semibold">{formatCurrency(r.cash_collected)}</td>
                          <td className="text-right text-blue font-semibold">{formatCurrency(r.upi_collected)}</td>
                          <td className="text-right text-amber font-semibold">{formatCurrency(r.cheque_collected)}</td>
                          <td className="text-right text-purple font-semibold">{formatCurrency(r.bank_collected)}</td>
                          <td className="text-right font-bold text-primary">{formatCurrency(r.total_collected_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 9. DAMAGED PRODUCTS REPORT */}
                {activeConfig.id === 'damaged-products' && (
                  <>
                    <thead>
                      <tr>
                        <th>Incident Code</th>
                        <th>Reported Date</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Damaged Qty</th>
                        <th>Unit Cost</th>
                        <th>Total Loss Valuation</th>
                        <th>Damage Reason</th>
                        <th>Location / Vehicle</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td className="font-mono text-red font-semibold">{r.damage_code}</td>
                          <td>{r.reported_date}</td>
                          <td>
                            <strong>{r.product_name}</strong>
                            <small className="cell-subtext">{r.product_sku}</small>
                          </td>
                          <td><span className="cat-pill">{r.category_name}</span></td>
                          <td className="text-right font-bold text-red">{parseFloat(r.quantity).toLocaleString()} {r.package_type}</td>
                          <td className="text-right">{formatCurrency(r.unit_cost)}</td>
                          <td className="text-right font-bold text-red">{formatCurrency(r.total_loss)}</td>
                          <td>
                            <span className="reason-pill">{r.reason}</span>
                          </td>
                          <td>{r.warehouse_or_van}</td>
                          <td>
                            <span className={`status-pill ${r.status === 'Disposed / Scrapped' ? 'status-neutral' : 'status-warning'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 10. VENDOR WISE STOCK REPORT */}
                {activeConfig.id === 'vendor-stock' && (
                  <>
                    <thead>
                      <tr>
                        <th>Supplier / Manufacturer</th>
                        <th>Contact Person</th>
                        <th>Category</th>
                        <th>Product Supplied</th>
                        <th>Unit Buy Price</th>
                        <th>Total Inward Qty</th>
                        <th>Total Purchase Value</th>
                        <th>Live Warehouse Stock</th>
                        <th>Stock Value on Hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{r.vendor_name}</strong>
                            <small className="cell-subtext">{r.vendor_location} • {r.vendor_phone}</small>
                          </td>
                          <td>{r.contact_person}</td>
                          <td><span className="cat-pill">{r.category_name}</span></td>
                          <td>
                            <strong>{r.product_name}</strong>
                            <small className="cell-subtext">{r.product_sku}</small>
                          </td>
                          <td className="text-right">{formatCurrency(r.buy_price)}</td>
                          <td className="text-right">{parseFloat(r.supplied_qty).toLocaleString()}</td>
                          <td className="text-right font-semibold">{formatCurrency(r.total_buy_amount)}</td>
                          <td className="text-right font-bold text-primary">{parseFloat(r.live_current_stock || 0).toLocaleString()}</td>
                          <td className="text-right font-bold text-emerald">{formatCurrency(r.current_stock_valuation)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 11. VENDOR WISE PAYMENTS REPORT */}
                {activeConfig.id === 'vendor-payments' && (
                  <>
                    <thead>
                      <tr>
                        <th>Supplier Company</th>
                        <th>Contact</th>
                        <th>GSTIN</th>
                        <th>Total Purchase Amount</th>
                        <th>Total Advance Paid</th>
                        <th>Pending Payable Dues</th>
                        <th>Recent Payments Summary</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((r, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{r.vendor_name}</strong>
                            <small className="cell-subtext">{r.place} • {r.vendor_code}</small>
                          </td>
                          <td>
                            {r.contact_person}
                            <small className="cell-subtext">{r.phone}</small>
                          </td>
                          <td className="font-mono text-muted">{r.gst_in || '-'}</td>
                          <td className="text-right font-semibold">{formatCurrency(r.total_purchase)}</td>
                          <td className="text-right font-semibold text-emerald">{formatCurrency(r.advance_paid)}</td>
                          <td className="text-right font-bold text-red">{formatCurrency(r.pending_payable)}</td>
                          <td>
                            {r.recent_payments && r.recent_payments.length > 0 ? (
                              <div className="recent-pay-chips">
                                {r.recent_payments.map((p, pIdx) => (
                                  <span key={pIdx} className="pay-chip">
                                    {p.payment_number}: {formatCurrency(p.amount_paid)} ({p.payment_mode})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted">No recent payouts</span>
                            )}
                          </td>
                          <td>
                            <span className="status-pill status-success">{r.status || 'Active'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 12. GST REPORT (GSTR-1, GSTR-2B, and GSTR-3B Statutory Returns) */}
                {activeConfig.id === 'gst' && (
                  <>
                    {/* MODE 1: GSTR-1 (OUTWARD SALES) */}
                    {gstReturnMode === 'gstr1' && (
                      <>
                        {gstSubTab === 'hsn' ? (
                          <>
                            <thead>
                              <tr>
                                <th>HSN / SAC Code</th>
                                <th>Description of Commodity</th>
                                <th>UQC Unit</th>
                                <th>Total Qty Sold</th>
                                <th>Taxable Value</th>
                                <th>CGST Amount</th>
                                <th>SGST Amount</th>
                                <th>IGST Amount</th>
                                <th>Total Tax Collected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(reportData.gstr1?.hsnSummary || reportData.hsnSummary || []).map((h, i) => (
                                <tr key={i}>
                                  <td className="font-mono font-bold text-primary">{h.hsn_code}</td>
                                  <td>{h.description}</td>
                                  <td><span className="cat-pill">{h.uqc}</span></td>
                                  <td className="text-right">{parseFloat(h.total_qty).toLocaleString()}</td>
                                  <td className="text-right font-semibold">{formatCurrency(h.taxable_value)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(h.cgst_amount)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(h.sgst_amount)}</td>
                                  <td className="text-right text-blue">{formatCurrency(h.igst_amount)}</td>
                                  <td className="text-right font-bold text-primary">
                                    {formatCurrency((h.cgst_amount || 0) + (h.sgst_amount || 0) + (h.igst_amount || 0))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        ) : gstSubTab === 'docs' ? (
                          <>
                            <thead>
                              <tr>
                                <th>Document Serial No.</th>
                                <th>Nature of Document</th>
                                <th>From Serial #</th>
                                <th>To Serial #</th>
                                <th>Total Number Issued</th>
                                <th>Cancelled</th>
                                <th>Net Issued Documents</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.gstr1?.docSummary ? (
                                <tr>
                                  <td className="font-mono font-bold text-primary">1</td>
                                  <td className="font-semibold">{reportData.gstr1.docSummary.natureOfDoc}</td>
                                  <td className="font-mono">{reportData.gstr1.docSummary.fromSerial}</td>
                                  <td className="font-mono">{reportData.gstr1.docSummary.toSerial}</td>
                                  <td className="text-right font-bold">{reportData.gstr1.docSummary.totalNumber}</td>
                                  <td className="text-right text-muted">{reportData.gstr1.docSummary.cancelledNumber}</td>
                                  <td className="text-right font-bold text-emerald">{reportData.gstr1.docSummary.netIssued}</td>
                                </tr>
                              ) : (
                                <tr>
                                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No documents summary available</td>
                                </tr>
                              )}
                            </tbody>
                          </>
                        ) : (
                          <>
                            <thead>
                              <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Customer &amp; Trade Name</th>
                                <th>Customer GSTIN</th>
                                <th>Type</th>
                                <th>State (POS)</th>
                                <th>Taxable Value</th>
                                <th>CGST (₹)</th>
                                <th>SGST (₹)</th>
                                <th>IGST (₹)</th>
                                <th>Total Invoice Value</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {((gstSubTab === 'b2b' ? reportData.gstr1?.b2b : (gstSubTab === 'b2c' ? reportData.gstr1?.b2c : (reportData.gstr1?.data || reportData.data))) || []).map((r, i) => (
                                <tr key={i}>
                                  <td className="font-mono font-bold text-primary">{r.invoice_number}</td>
                                  <td>{r.invoice_date}</td>
                                  <td>
                                    <strong>{r.customer_name}</strong>
                                    {r.customer_phone && <small className="cell-subtext">{r.customer_phone}</small>}
                                  </td>
                                  <td className="font-mono">{r.customer_gstin || <span className="text-muted">Unregistered</span>}</td>
                                  <td>
                                    <span className={`status-pill ${r.transaction_type === 'B2B' ? 'status-info' : 'status-warning'}`}>
                                      {r.transaction_type}
                                    </span>
                                  </td>
                                  <td>State ({r.state_code})</td>
                                  <td className="text-right font-semibold">{formatCurrency(r.taxable_value)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(r.cgst_amount)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(r.sgst_amount)}</td>
                                  <td className="text-right text-blue">{formatCurrency(r.igst_amount)}</td>
                                  <td className="text-right font-bold text-primary">{formatCurrency(r.grand_total)}</td>
                                  <td>
                                    <span className={`status-pill ${r.payment_status === 'Paid' ? 'status-success' : 'status-warning'}`}>
                                      {r.payment_status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        )}
                      </>
                    )}

                    {/* MODE 2: GSTR-2B (INWARD PURCHASES & ITC) */}
                    {gstReturnMode === 'gstr2' && (
                      <>
                        {gstSubTab === 'vendor' ? (
                          <>
                            <thead>
                              <tr>
                                <th>Vendor / Supplier Company</th>
                                <th>Vendor GSTIN</th>
                                <th>Depot / Place</th>
                                <th>Bills Count</th>
                                <th>Total Purchases</th>
                                <th>Taxable Inward Value</th>
                                <th>Input CGST (₹)</th>
                                <th>Input SGST (₹)</th>
                                <th>Input IGST (₹)</th>
                                <th>Total Eligible ITC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(reportData.gstr2?.vendorSummary || []).map((v, i) => (
                                <tr key={i}>
                                  <td><strong>{v.vendor_name}</strong></td>
                                  <td className="font-mono">{v.vendor_gstin}</td>
                                  <td>{v.vendor_place || 'Depot'}</td>
                                  <td className="text-right font-semibold">{v.po_count}</td>
                                  <td className="text-right font-bold">{formatCurrency(v.total_purchases)}</td>
                                  <td className="text-right">{formatCurrency(v.taxable_value)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(v.cgst_amount)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(v.sgst_amount)}</td>
                                  <td className="text-right text-blue">{formatCurrency(v.igst_amount)}</td>
                                  <td className="text-right font-bold text-emerald">{formatCurrency(v.total_itc)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        ) : (
                          <>
                            <thead>
                              <tr>
                                <th>PO / Ref Bill #</th>
                                <th>Bill Date</th>
                                <th>Vendor / Supplier</th>
                                <th>Vendor GSTIN</th>
                                <th>Place of Supply</th>
                                <th>Supply Type</th>
                                <th>Taxable Value</th>
                                <th>Input CGST (₹)</th>
                                <th>Input SGST (₹)</th>
                                <th>Input IGST (₹)</th>
                                <th>Total Bill Amount</th>
                                <th>ITC Eligibility</th>
                              </tr>
                            </thead>
                            <tbody>
                              {((gstSubTab === 'b2b' ? reportData.gstr2?.b2b : reportData.gstr2?.data) || []).map((po, i) => (
                                <tr key={i}>
                                  <td className="font-mono font-bold text-primary">{po.invoice_number}</td>
                                  <td>{po.invoice_date}</td>
                                  <td><strong>{po.vendor_name}</strong></td>
                                  <td className="font-mono">{po.vendor_gstin}</td>
                                  <td>{po.place_of_supply}</td>
                                  <td>
                                    <span className="cat-pill">{po.supply_type}</span>
                                  </td>
                                  <td className="text-right font-semibold">{formatCurrency(po.taxable_value)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(po.cgst_amount)}</td>
                                  <td className="text-right text-emerald">{formatCurrency(po.sgst_amount)}</td>
                                  <td className="text-right text-blue">{formatCurrency(po.igst_amount)}</td>
                                  <td className="text-right font-bold text-primary">{formatCurrency(po.grand_total)}</td>
                                  <td>
                                    <span className={`status-pill ${po.itc_status === 'Eligible' ? 'status-success' : 'status-warning'}`}>
                                      {po.itc_status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        )}
                      </>
                    )}

                    {/* MODE 3: GSTR-3B (MONTHLY SUMMARY RETURN) */}
                    {gstReturnMode === 'gstr3b' && (
                      <>
                        {/* Table 3.1: Outward Supplies */}
                        {(gstSubTab === 'all' || gstSubTab === '3.1') && (
                          <>
                            <thead>
                              <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                                <th colSpan="6" style={{ background: '#1e293b', color: '#ffffff', fontSize: '13px', padding: '12px 16px' }}>
                                  3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
                                </th>
                              </tr>
                              <tr>
                                <th>Nature of Supplies</th>
                                <th className="text-right">Total Taxable Value (₹)</th>
                                <th className="text-right">Integrated Tax / IGST (₹)</th>
                                <th className="text-right">Central Tax / CGST (₹)</th>
                                <th className="text-right">State / UT Tax / SGST (₹)</th>
                                <th className="text-right">Cess (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(reportData.gstr3b?.table31?.rows || []).map((row, i) => (
                                <tr key={`t31-${i}`} style={i === 0 ? { fontWeight: 600, background: '#f8fafc' } : {}}>
                                  <td>{row.nature}</td>
                                  <td className="text-right font-mono">{formatCurrency(row.taxable_value)}</td>
                                  <td className="text-right font-mono text-blue">{formatCurrency(row.igst)}</td>
                                  <td className="text-right font-mono text-emerald">{formatCurrency(row.cgst)}</td>
                                  <td className="text-right font-mono text-emerald">{formatCurrency(row.sgst)}</td>
                                  <td className="text-right font-mono text-muted">{formatCurrency(row.cess)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        )}

                        {/* Table 4: Eligible Input Tax Credit */}
                        {(gstSubTab === 'all' || gstSubTab === '4') && (
                          <>
                            <thead>
                              <tr style={{ background: '#064e3b', color: '#ffffff' }}>
                                <th colSpan="6" style={{ background: '#064e3b', color: '#ffffff', fontSize: '13px', padding: '12px 16px' }}>
                                  4. Eligible Input Tax Credit (ITC Availed)
                                </th>
                              </tr>
                              <tr>
                                <th>Details of Input Tax Credit (ITC)</th>
                                <th className="text-right">Integrated Tax / IGST (₹)</th>
                                <th className="text-right">Central Tax / CGST (₹)</th>
                                <th className="text-right">State / UT Tax / SGST (₹)</th>
                                <th className="text-right">Cess (₹)</th>
                                <th>Classification</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(reportData.gstr3b?.table4?.rows || []).map((row, i) => (
                                <tr key={`t4-${i}`} style={row.is_net ? { fontWeight: 700, background: '#ecfdf5' } : {}}>
                                  <td>{row.nature}</td>
                                  <td className="text-right font-mono text-blue">{formatCurrency(row.igst)}</td>
                                  <td className="text-right font-mono text-emerald">{formatCurrency(row.cgst)}</td>
                                  <td className="text-right font-mono text-emerald">{formatCurrency(row.sgst)}</td>
                                  <td className="text-right font-mono text-muted">{formatCurrency(row.cess)}</td>
                                  <td>
                                    <span className={`status-pill ${row.is_net ? 'status-success' : 'status-info'}`}>
                                      {row.is_net ? 'Net Claimable' : 'Inward Sourced'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        )}

                        {/* Table 6.1: Payment of Tax (Net Tax Payable in Cash) */}
                        {(gstSubTab === 'all' || gstSubTab === '6.1') && (
                          <>
                            <thead>
                              <tr style={{ background: '#581c87', color: '#ffffff' }}>
                                <th colSpan="6" style={{ background: '#581c87', color: '#ffffff', fontSize: '13px', padding: '12px 16px' }}>
                                  6.1 Payment of Tax (Net Tax Payable in Cash &amp; Credit Set-off under Rule 88A)
                                </th>
                              </tr>
                              <tr>
                                <th>Description / Head</th>
                                <th className="text-right">Total Tax Payable (Output)</th>
                                <th className="text-right">Paid Through ITC (Input)</th>
                                <th className="text-right">Net Tax Payable in Cash</th>
                                <th className="text-right">Balance ITC Carried Forward</th>
                                <th>Settlement Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(reportData.gstr3b?.table61?.rows || []).map((row, i) => (
                                <tr key={`t61-${i}`} style={row.is_total ? { fontWeight: 800, background: '#f5f3ff', borderTop: '2px solid #cbd5e1' } : {}}>
                                  <td><strong>{row.tax_type}</strong></td>
                                  <td className="text-right font-mono">{formatCurrency(row.total_tax_payable)}</td>
                                  <td className="text-right font-mono text-blue">{formatCurrency(row.paid_through_itc)}</td>
                                  <td className={`text-right font-mono ${row.tax_payable_in_cash > 0 ? 'text-red font-bold' : 'text-emerald'}`}>
                                    {formatCurrency(row.tax_payable_in_cash)}
                                  </td>
                                  <td className="text-right font-mono text-emerald font-semibold">{formatCurrency(row.balance_itc_cf)}</td>
                                  <td>
                                    <span className={`status-pill ${row.tax_payable_in_cash > 0 ? 'status-warning' : 'status-success'}`}>
                                      {row.tax_payable_in_cash > 0 ? 'Cash Challan Needed' : 'ITC Set-off Complete'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* 13. CUSTOMER WISE REPORT */}
                {activeConfig.id === 'customer-wise' && (
                  <>
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Customer / Store</th>
                        <th>Cust Code</th>
                        <th>GSTIN</th>
                        <th>Sales Representative</th>
                        <th className="text-right">Taxable (₹)</th>
                        <th className="text-right">CGST (₹)</th>
                        <th className="text-right">SGST (₹)</th>
                        <th className="text-right">Grand Total (₹)</th>
                        <th className="text-right">Paid (₹)</th>
                        <th className="text-right">Balance Due (₹)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.data || []).map((r, i) => (
                        <tr key={i}>
                          <td className="font-mono font-bold text-primary">{r.invoice_number}</td>
                          <td>{r.invoice_date}</td>
                          <td>
                            <strong>{r.customer_name}</strong>
                            {r.customer_phone && <small className="cell-subtext">{r.customer_phone}</small>}
                          </td>
                          <td className="font-mono">{r.customer_code || '-'}</td>
                          <td className="font-mono text-muted">{r.customer_gstin || 'Unregistered (B2C)'}</td>
                          <td>{r.salesman_name || 'Direct Order'}</td>
                          <td className="text-right font-semibold">{formatCurrency(r.taxable_value)}</td>
                          <td className="text-right text-emerald">{formatCurrency(r.cgst_amount)}</td>
                          <td className="text-right text-emerald">{formatCurrency(r.sgst_amount)}</td>
                          <td className="text-right font-bold text-primary">{formatCurrency(r.grand_total)}</td>
                          <td className="text-right text-emerald">{formatCurrency(r.paid_amount)}</td>
                          <td className={`text-right font-bold ${parseFloat(r.balance_due) > 0 ? 'text-red' : 'text-emerald'}`}>
                            {formatCurrency(r.balance_due)}
                          </td>
                          <td>
                            <span className={`status-pill ${r.payment_status === 'Paid' ? 'status-success' : (r.payment_status === 'Partial' ? 'status-info' : 'status-warning')}`}>
                              {r.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {/* 14. EXPENSES REPORT */}
                {activeConfig.id === 'expenses' && (
                  <>
                    <thead>
                      <tr>
                        <th>Salesman Name</th>
                        <th>Contact</th>
                        <th>Expenses Logged</th>
                        <th>Fuel &amp; Travel (₹)</th>
                        <th>Food &amp; Meals (₹)</th>
                        <th>Toll &amp; Vehicle (₹)</th>
                        <th className="text-right">Total Expenses (₹)</th>
                        <th className="text-right">Cash Collected (₹)</th>
                        <th className="text-right">Net Cash in Hand (₹)</th>
                        <th>Handover Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.data || []).map((r, i) => {
                        const cats = r.categories || {};
                        const fuel = (cats['Fuel / Diesel'] || 0) + (cats['Fuel'] || 0);
                        const food = (cats['Food & Meals'] || 0) + (cats['Food'] || 0);
                        const tollVeh = (cats['Toll & Parking'] || 0) + (cats['Toll'] || 0) + (cats['Vehicle Repair'] || 0);
                        return (
                          <tr key={i}>
                            <td>
                              <strong>{r.salesman_name}</strong>
                              <small className="cell-subtext">{r.salesman_id ? `ID: ${r.salesman_id}` : 'Field Sales'}</small>
                            </td>
                            <td>{r.phone || '-'}</td>
                            <td>
                              <span className="count-pill">{r.expense_count || 0} receipts</span>
                            </td>
                            <td className="text-amber font-semibold">{formatCurrency(fuel)}</td>
                            <td className="text-emerald">{formatCurrency(food)}</td>
                            <td className="text-purple">{formatCurrency(tollVeh)}</td>
                            <td className="text-right font-bold text-red">
                              -{formatCurrency(r.total_expenses)}
                            </td>
                            <td className="text-right font-semibold text-blue">
                              +{formatCurrency(r.total_cash_collected)}
                            </td>
                            <td className="text-right font-bold text-emerald" style={{ fontSize: '14px' }}>
                              {formatCurrency(r.net_cash_inhand)}
                            </td>
                            <td>
                              <span className={`status-pill ${r.status === 'Settled' || r.net_cash_inhand <= 0 ? 'status-success' : 'status-warning'}`}>
                                {r.status === 'Settled' ? 'Settled' : (r.net_cash_inhand > 0 ? 'Cash to Handover' : 'Settled')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {/* 15. CUSTOMER FINANCIAL & ACCOUNT LEDGER REPORT */}
                {activeConfig.id === 'ledger' && (
                  <>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Voucher / Ref #</th>
                        <th>Type</th>
                        <th>Customer / Store</th>
                        <th>Particulars / Description</th>
                        <th>Payment Mode</th>
                        <th>Sales Executive</th>
                        <th className="text-right">Debit (Dr ₹)</th>
                        <th className="text-right">Credit (Cr ₹)</th>
                        <th className="text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.data || []).map((r, i) => {
                        const isDr = (parseFloat(r.debit) || 0) > 0;
                        const isCr = (parseFloat(r.credit) || 0) > 0;
                        const typeBadgeClass = r.transaction_type === 'INVOICE'
                          ? 'status-info'
                          : r.transaction_type === 'PAYMENT'
                          ? 'status-success'
                          : 'status-warning';

                        const typeLabel = r.transaction_type === 'INVOICE'
                          ? 'Sales Invoice (Dr)'
                          : r.transaction_type === 'PAYMENT'
                          ? 'Payment Receipt (Cr)'
                          : 'Credit Note (Cr)';

                        return (
                          <tr key={i}>
                            <td className="whitespace-nowrap font-mono text-xs">
                              {r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : '-'}
                            </td>
                            <td className="font-mono font-bold text-primary">{r.reference_no}</td>
                            <td>
                              <span className={`status-pill ${typeBadgeClass}`}>
                                {typeLabel}
                              </span>
                            </td>
                            <td>
                              <strong>{r.customer_name}</strong>
                              {(r.customer_code || r.customer_phone) && (
                                <small className="cell-subtext">
                                  {r.customer_code ? `${r.customer_code} • ` : ''}{r.customer_phone || ''}
                                  {r.customer_place ? ` (${r.customer_place})` : ''}
                                </small>
                              )}
                            </td>
                            <td style={{ maxWidth: '280px', lineHeight: '1.4' }}>
                              <span>{r.particulars}</span>
                            </td>
                            <td>
                              <span className={`mode-badge mode-${(r.payment_mode || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                {r.payment_mode || 'Credit'}
                              </span>
                            </td>
                            <td className="text-muted">{r.salesman_name || 'Direct / Head Office'}</td>
                            <td className="text-right font-bold" style={{ color: isDr ? '#dc2626' : '#94a3b8' }}>
                              {isDr ? formatCurrency(r.debit) : '-'}
                            </td>
                            <td className="text-right font-bold" style={{ color: isCr ? '#059669' : '#94a3b8' }}>
                              {isCr ? formatCurrency(r.credit) : '-'}
                            </td>
                            <td className="text-right font-bold" style={{ fontSize: '13px' }}>
                              <span style={{ color: r.balance_type === 'Dr' ? '#b45309' : '#059669' }}>
                                {formatCurrency(Math.abs(r.running_balance))}
                              </span>
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: r.balance_type === 'Dr' ? '#fef3c7' : '#dcfce7',
                                  color: r.balance_type === 'Dr' ? '#92400e' : '#166534',
                                  fontWeight: '700'
                                }}
                              >
                                {r.balance_type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsHub;
