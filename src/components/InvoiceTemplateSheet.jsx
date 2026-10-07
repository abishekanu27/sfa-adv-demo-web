import React, { useState } from 'react';
import { QrCode, FileText, Smartphone, Receipt, CheckCircle2 } from 'lucide-react';
import { getCompanyLogo } from '../utils/companyBranding';
import './InvoiceTemplateSheet.css';

export const formatInvoiceDateTime = (rawDate, rawCreatedAt) => {
  if (!rawDate && !rawCreatedAt) return '—';
  // Use created_at if available for real sale timestamp, or fallback to invoice_date
  const source = rawCreatedAt || rawDate;
  try {
    const d = new Date(source);
    if (isNaN(d.getTime())) return String(source);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return String(source);
  }
};

export const formatInvoiceDateOnly = (rawDate) => {
  if (!rawDate) return '—';
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return String(rawDate);
  }
};

export const numberToWordsINR = (num) => {
  if (num == null || isNaN(num)) return 'Zero';
  num = Math.round(Number(num) * 100) / 100;
  if (num === 0) return 'Zero';

  const [intPart, decPart] = String(num).split('.');
  let n = parseInt(intPart, 10);

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwo = (v) => {
    if (v === 0) return '';
    if (v < 20) return a[v];
    const tens = Math.floor(v / 10);
    const ones = v % 10;
    return b[tens] + (ones > 0 ? ' ' + a[ones] : '');
  };

  const convertThree = (v) => {
    let str = '';
    const h = Math.floor(v / 100);
    const r = v % 100;
    if (h > 0) {
      str += a[h] + ' Hundred';
      if (r > 0) str += ' ';
    }
    if (r > 0) str += convertTwo(r);
    return str;
  };

  let words = '';
  const cr = Math.floor(n / 10000000); n %= 10000000;
  const lk = Math.floor(n / 100000); n %= 100000;
  const th = Math.floor(n / 1000); n %= 1000;

  if (cr > 0) words += convertTwo(cr) + ' Crore ';
  if (lk > 0) words += convertTwo(lk) + ' Lakh ';
  if (th > 0) words += convertTwo(th) + ' Thousand ';
  if (n > 0) words += convertThree(n) + ' ';

  words = words.trim();
  if (!words) words = 'Zero';

  if (decPart) {
    const paise = parseInt(decPart.padEnd(2, '0').slice(0, 2), 10);
    if (paise > 0) {
      words += ' and ' + convertTwo(paise) + ' Paise';
    }
  }

  return words;
};

export const wrapItemDescription13 = (name, maxLen = 13) => {
  if (!name) return [];
  const words = String(name).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      if (word.length > maxLen) {
        for (let i = 0; i < word.length; i += maxLen) {
          lines.push(word.slice(i, i + maxLen));
        }
      } else {
        current = word;
      }
    } else if ((current + ' ' + word).length <= maxLen) {
      current += ' ' + word;
    } else {
      lines.push(current);
      if (word.length > maxLen) {
        for (let i = 0; i < word.length; i += maxLen) {
          lines.push(word.slice(i, i + maxLen));
        }
        current = '';
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
};

export const InvoiceTemplateSheet = ({
  invoice,
  companySettings = {},
  invoiceSettings = {},
  activeTemplate: controlledTemplate,
  showFormatBar = true,
  onTemplateChange,
  id = 'printable-invoice'
}) => {
  const sampleInvoice = {
    invoice_number: invoiceSettings.invoice_prefix ? `${invoiceSettings.invoice_prefix}0084` : 'INV-2026-0084',
    invoice_type: (controlledTemplate === 'normal' || invoiceSettings.active_template === 'normal') ? 'NON_GST' : 'GST',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    customer_name: 'Metro Hypermarket Ltd',
    customer_address: 'Door 45, Commercial Street, Gandhi Nagar',
    customer_city: 'Kochi, Kerala - 682016',
    customer_gstin: (controlledTemplate === 'normal' || invoiceSettings.active_template === 'normal') ? '' : '32AABCM4592L1Z9',
    customer_phone: '+91 94471 23456',
    salesman_name: 'Abishek (Route Van 4)',
    vehicle_reg_no: 'KL-09-BB-0309',
    payment_mode: 'UPI / Credit',
    payment_status: 'Paid',
    paid_amount: 6736.00,
    discount_amount: 250.00,
    round_off: -0.40,
    balance_due: 0.00,
    items: [
      { id: 1, name: 'Masala Tea Premium 250g', product_name: 'Masala Tea Premium 250g', hsn_code: '0902', hsn: '0902', qty: 20, unit: 'pkts', rate: 120.00, unit_price: 120.00, gst_rate: 5 },
      { id: 2, name: 'Whole Grain Atta 5kg', product_name: 'Whole Grain Atta 5kg', hsn_code: '1101', hsn: '1101', qty: 10, unit: 'bags', rate: 240.00, unit_price: 240.00, gst_rate: 0 },
      { id: 3, name: 'Refined Sunflower Oil 1L', product_name: 'Refined Sunflower Oil 1L', hsn_code: '1512', hsn: '1512', qty: 15, unit: 'ltrs', rate: 135.00, unit_price: 135.00, gst_rate: 5 },
      { id: 4, name: 'Instant Noodles 70g (Pack of 12)', product_name: 'Instant Noodles 70g (Pack of 12)', hsn_code: '1902', hsn: '1902', qty: 8, unit: 'cartons', rate: 180.00, unit_price: 180.00, gst_rate: 12 }
    ]
  };

  const activeInvoice = invoice || sampleInvoice;

  // Determine initial template based on invoice type
  const isInvoiceGst = activeInvoice.invoice_type === 'GST' || 
    Boolean(activeInvoice.customer_gstin && !['URP', 'NON-GST', 'NIL', 'NONE'].includes(String(activeInvoice.customer_gstin).trim().toUpperCase())) ||
    Boolean(activeInvoice.has_gst) ||
    Boolean(activeInvoice.total_gst && Number(activeInvoice.total_gst) > 0) ||
    Boolean(activeInvoice.total_cgst && Number(activeInvoice.total_cgst) > 0) ||
    Boolean(activeInvoice.cgst && Number(activeInvoice.cgst) > 0) ||
    Boolean(activeInvoice.tax_amount && Number(activeInvoice.tax_amount) > 0) ||
    Boolean((controlledTemplate === 'purchase_order' || activeInvoice.po_number) && activeInvoice.vendor_gstin && !['URP', 'NON-GST', 'NIL', 'NONE'].includes(String(activeInvoice.vendor_gstin).trim().toUpperCase()));

  const defaultTemplate = controlledTemplate || (isInvoiceGst ? 'gst' : 'normal');
  const [internalTemplate, setInternalTemplate] = useState(defaultTemplate);
  const currentTemplate = controlledTemplate || (showFormatBar ? internalTemplate : (isInvoiceGst ? 'gst' : 'normal'));

  const handleSelectTemplate = (tmpl) => {
    setInternalTemplate(tmpl);
    if (onTemplateChange) onTemplateChange(tmpl);
  };

  // Company Profile
  const company = {
    company_name: companySettings.company_name || '',
    legal_name: companySettings.legal_name || companySettings.company_name || '',
    logo_url: companySettings.logo_url || '',
    address_line1: companySettings.address_line1 || companySettings.address || '',
    address_line2: companySettings.address_line2 || '',
    city: companySettings.city || '',
    state: companySettings.state || '',
    state_code: companySettings.state_code || '',
    pincode: companySettings.pincode || '',
    gstin: companySettings.gstin || '',
    phone: companySettings.phone || '',
    email: companySettings.email || '',
    bank_name: companySettings.bank_name || '',
    account_holder: companySettings.account_holder || companySettings.company_name || '',
    account_number: companySettings.account_number || '',
    ifsc_code: companySettings.ifsc_code || '',
    bank_branch: companySettings.bank_branch || '',
    upi_id: companySettings.upi_id || '',
    terms_and_conditions: invoiceSettings.terms_and_conditions || companySettings.terms_and_conditions || '',
    credit_note_terms: invoiceSettings.credit_note_terms || companySettings.credit_note_terms || '',
    purchase_order_terms: invoiceSettings.purchase_order_terms || companySettings.purchase_order_terms || ''
  };

  // Print Configuration Options
  const settings = {
    show_logo: invoiceSettings.show_logo !== false,
    show_hsn: invoiceSettings.show_hsn !== false,
    show_gst_breakdown: invoiceSettings.show_gst_breakdown !== false,
    show_bank_details: invoiceSettings.show_bank_details !== false,
    show_upi_qr: invoiceSettings.show_upi_qr !== false,
    show_signature: invoiceSettings.show_signature !== false,
    show_terms: invoiceSettings.show_terms !== false,
    thermal_width: invoiceSettings.thermal_width || '80mm',
    signature_label: invoiceSettings.signature_label || 'Authorized Signatory',
    invoice_title: invoiceSettings.invoice_title,
    credit_note_terms: invoiceSettings.credit_note_terms || companySettings.credit_note_terms,
    purchase_order_terms: invoiceSettings.purchase_order_terms || companySettings.purchase_order_terms
  };

  // Invoice title: "INVOICE" for GST invoices, "ESTIMATE" for Non-GST invoices
  const stampTitle = isInvoiceGst
    ? (settings.invoice_title && !['CASH MEMO', 'RETAIL CASH MEMO', 'BILL OF SUPPLY / CASH MEMO', 'RETAIL CASH MEMO / BILL OF SUPPLY', 'ESTIMATE'].includes(String(settings.invoice_title).trim().toUpperCase()) ? settings.invoice_title : 'INVOICE')
    : 'ESTIMATE';

  // Normalize Customer details
  const customer = {
    name: activeInvoice.customer_name || activeInvoice.customer?.name || 'Retail Customer',
    address: activeInvoice.customer_address || activeInvoice.customer?.address || activeInvoice.place || activeInvoice.customer_place || '',
    city: activeInvoice.customer_city || activeInvoice.customer?.city || company.city,
    state: activeInvoice.customer_state || activeInvoice.customer?.state || company.state,
    state_code: activeInvoice.customer_state_code || '',
    gstin: activeInvoice.customer_gstin || activeInvoice.customer?.gstin || '',
    contact: activeInvoice.customer_phone || activeInvoice.customer?.phone || activeInvoice.phone || activeInvoice.customer?.contact || ''
  };

  // Dates & Metadata
  const invoiceNo = activeInvoice.invoice_number || activeInvoice.invoice_no || 'INV-2026-0001';
  const invoiceDate = formatInvoiceDateTime(activeInvoice.invoice_date, activeInvoice.created_at);
  const dueDate = formatInvoiceDateOnly(activeInvoice.due_date || activeInvoice.invoice_date || activeInvoice.created_at);
  const salesmanName = activeInvoice.salesman_name || activeInvoice.salesman || 'Abishek (Van Field Sales)';
  const paymentMode = activeInvoice.payment_mode || 'Cash';
  const paymentStatus = activeInvoice.payment_status || (Number(activeInvoice.balance_due) <= 0 ? 'Paid' : 'Partial');

  // Normalize Items
  const rawItems = Array.isArray(activeInvoice.items) 
    ? activeInvoice.items 
    : (typeof activeInvoice.items === 'string' ? JSON.parse(activeInvoice.items || '[]') : []);

  const items = rawItems.map((item, idx) => {
    const qty = parseFloat(item.qty != null ? item.qty : item.quantity) || 1;
    const rate = parseFloat(item.rate != null ? item.rate : item.unit_price) || 0;
    const gross = qty * rate;
    const gstRate = parseFloat(item.gst_rate) || (isInvoiceGst ? 18 : 0);
    const rawLineTotal = parseFloat(item.total != null ? item.total : item.total_price);
    const lineTotal = (!isNaN(rawLineTotal) && rawLineTotal > 0) ? rawLineTotal : gross;

    let lineTaxable = lineTotal;
    let cgst = 0;
    let sgst = 0;

    if (isInvoiceGst && gstRate > 0) {
      if (
        item.taxable_amount != null &&
        parseFloat(item.taxable_amount) < lineTotal &&
        parseFloat(item.taxable_amount) > 0
      ) {
        lineTaxable = parseFloat(item.taxable_amount);
        const diffGst = Math.max(0, lineTotal - lineTaxable);
        cgst = parseFloat(item.cgst != null ? item.cgst : (item.cgst_amount != null ? item.cgst_amount : diffGst / 2));
        sgst = parseFloat(item.sgst != null ? item.sgst : (item.sgst_amount != null ? item.sgst_amount : diffGst / 2));
      } else {
        // Selling price / lineTotal is GST inclusive: Taxable Value = lineTotal / (1 + gstRate / 100)
        lineTaxable = Math.round((lineTotal / (1 + gstRate / 100)) * 100) / 100;
        const lineGst = Math.round((lineTotal - lineTaxable) * 100) / 100;
        cgst = Math.round((lineGst / 2) * 100) / 100;
        sgst = Math.round((lineGst - cgst) * 100) / 100;
      }
    } else {
      lineTaxable = lineTotal;
      cgst = 0;
      sgst = 0;
    }

    const mrp = parseFloat(item.mrp != null ? item.mrp : item.mrp_price) || rate;

    return {
      id: idx + 1,
      name: item.product_name || item.name || 'Product Item',
      hsn: item.hsn_code || item.hsn || item.sku || (isInvoiceGst ? '1905' : '—'),
      package_type: item.package_type || item.unit || 'Loose',
      qty,
      unit: (item.unit && String(item.unit).toLowerCase() === 'loose') ? 'Bag' : (item.unit || item.package_type || 'Pcs'),
      mrp,
      rate,
      taxable: lineTaxable,
      gst_rate: gstRate,
      cgst,
      sgst,
      total: lineTotal
    };
  });

  // Calculate Sub Total (Gross) - sum of line totals (inclusive of GST)
  const subtotalGross = items.reduce((sum, i) => sum + i.total, 0);

  // Fetch Total Discount from DB if present (discount_amount / discount)
  const dbDiscount = parseFloat(
    activeInvoice.discount_amount != null 
      ? activeInvoice.discount_amount 
      : (activeInvoice.discount != null ? activeInvoice.discount : 0)
  ) || 0;
  const itemsDiscount = items.reduce((sum, i) => sum + (parseFloat(itemDiscount => itemDiscount.discount_amount) || 0), 0);
  const totalDiscount = dbDiscount > 0 ? dbDiscount : (activeInvoice.discount ? parseFloat(activeInvoice.discount) : 0);

  // Final discounted total
  const netGross = Math.max(0, subtotalGross - totalDiscount);
  const discountFactor = subtotalGross > 0 ? (netGross / subtotalGross) : 1;

  // Total Taxable Value & Taxes calculated after applying total discount
  // Taxable Value = Total - GST (for each discounted item)
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  if (isInvoiceGst) {
    items.forEach(i => {
      const discountedItemTotal = i.total * discountFactor;
      if (i.gst_rate > 0) {
        const itemTaxable = Math.round((discountedItemTotal / (1 + i.gst_rate / 100)) * 100) / 100;
        const itemGst = Math.round((discountedItemTotal - itemTaxable) * 100) / 100;
        const itemCgst = Math.round((itemGst / 2) * 100) / 100;
        const itemSgst = Math.round((itemGst - itemCgst) * 100) / 100;
        totalTaxable += itemTaxable;
        totalCgst += itemCgst;
        totalSgst += itemSgst;
      } else {
        totalTaxable += discountedItemTotal;
      }
    });
  } else {
    totalTaxable = netGross;
  }

  const totalGst = totalCgst + totalSgst;

  // Grand Total calculation: Total Taxable Value + CGST + SGST (exact match with netGross)
  const calculatedGrandTotal = isInvoiceGst ? (totalTaxable + totalGst) : netGross;
  const rawGrandTotal = parseFloat(activeInvoice.grand_total != null ? activeInvoice.grand_total : (activeInvoice.total_amount != null ? activeInvoice.total_amount : activeInvoice.amount));
  
  const dbRoundOff = activeInvoice.round_off != null ? parseFloat(activeInvoice.round_off) : null;
  const roundOff = dbRoundOff != null ? dbRoundOff : (Math.round((Math.round(calculatedGrandTotal) - calculatedGrandTotal) * 100) / 100);
  const grandTotal = Math.round((calculatedGrandTotal + roundOff) * 100) / 100;
  const paidAmount = parseFloat(activeInvoice.paid_amount) || grandTotal;
  const balanceDue = parseFloat(activeInvoice.balance_due != null ? activeInvoice.balance_due : Math.max(0, grandTotal - paidAmount));

  const upiPayLink = `upi://pay?pa=${encodeURIComponent(company.upi_id)}&pn=${encodeURIComponent(company.legal_name || company.company_name)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNo}`)}`;
  const upiQrUrl = (settings.show_upi_qr && company.upi_id)
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(upiPayLink)}`
    : '';

  return (
    <div className="invoice-template-sheet-container">
      {/* Format Selector Bar */}
      {showFormatBar && (
        <div className="invoice-template-format-bar no-print">
          <button
            type="button"
            className={`format-pill-button ${currentTemplate === 'gst' ? 'active' : ''}`}
            onClick={() => handleSelectTemplate('gst')}
          >
            <FileText size={14} />
            <span>GST Tax Invoice (A4 Standard)</span>
          </button>

          <button
            type="button"
            className={`format-pill-button ${currentTemplate === 'normal' ? 'active' : ''}`}
            onClick={() => handleSelectTemplate('normal')}
          >
            <FileText size={14} />
            <span>Commercial Bill (Non-GST)</span>
          </button>

          <button
            type="button"
            className={`format-pill-button ${currentTemplate === 'mobile' ? 'active' : ''}`}
            onClick={() => handleSelectTemplate('mobile')}
          >
            <Smartphone size={14} />
            <span>Mobile Field Invoice</span>
          </button>

          <button
            type="button"
            className={`format-pill-button ${currentTemplate === 'thermal' ? 'active' : ''}`}
            onClick={() => handleSelectTemplate('thermal')}
          >
            <Receipt size={14} />
            <span>Thermal POS Receipt ({settings.thermal_width})</span>
          </button>

          <button
            type="button"
            className={`format-pill-button ${currentTemplate === 'credit_note' ? 'active' : ''}`}
            onClick={() => handleSelectTemplate('credit_note')}
          >
            <Receipt size={14} />
            <span>Credit Note Voucher</span>
          </button>

          <button
            type="button"
            className={`format-pill-button ${currentTemplate === 'purchase_order' ? 'active' : ''}`}
            onClick={() => handleSelectTemplate('purchase_order')}
          >
            <FileText size={14} />
            <span>Purchase Order Document</span>
          </button>
        </div>
      )}

      {/* 1. GST TAX INVOICE PREVIEW (A4 STANDARD) */}
      {currentTemplate === 'gst' && (
        <div className="printable-sheet a4-sheet gst-invoice-layout" id={id}>
          {/* Header Block */}
          <div className="gst-header-block">
            <div className="gst-company-brand">
              {settings.show_logo && company.logo_url && (
                <img src={company.logo_url} alt="Logo" className="invoice-header-logo" />
              )}
              <div>
                <h2 className="company-print-title">{company.legal_name}</h2>
                <p className="company-print-addr">
                  {company.address_line1}
                  {company.address_line2 && `, ${company.address_line2}`}
                  {company.city && `, ${company.city}`}
                  {company.state && ` - ${company.state}`}
                  {company.pincode && ` (${company.pincode})`}
                </p>
                <p className="company-print-contacts">
                  {company.gstin?.trim() ? (
                    <span>GSTIN: <strong>{company.gstin.trim()}</strong>{company.state?.trim() || company.phone?.trim() ? ' | ' : ''}</span>
                  ) : null}
                  {company.state?.trim() ? (
                    <span>State: <strong>{company.state.trim()}{company.state_code?.trim() ? ` (Code: ${company.state_code.trim()})` : ''}</strong>{company.phone?.trim() ? ' | ' : ''}</span>
                  ) : null}
                  {company.phone?.trim() ? (
                    <span>Phone: {company.phone.trim()}</span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="gst-invoice-meta">
              <div className="invoice-title-stamp">
                {stampTitle}
              </div>
              <table className="meta-compact-table">
                <tbody>
                  <tr><td>Invoice No:</td><td><strong>{invoiceNo}</strong></td></tr>
                  <tr><td>Invoice Date:</td><td><strong>{invoiceDate}</strong></td></tr>
                  <tr><td>Due Date:</td><td>{dueDate}</td></tr>
                  <tr><td>Place of Supply:</td><td>{customer.state || company.state || 'Local'}{customer.state_code?.trim() ? ` (${customer.state_code.trim()})` : (company.state_code?.trim() ? ` (${company.state_code.trim()})` : '')}</td></tr>
                  <tr><td>Reverse Charge:</td><td>No</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Buyer Details Grid */}
          <div className="gst-buyer-grid">
            <div className="buyer-box">
              <h4>Billed To (Customer Details):</h4>
              <p className="buyer-name">{customer.name} {activeInvoice.customer_code ? `(${activeInvoice.customer_code})` : ''}</p>
              {customer.address && <p className="buyer-detail">{customer.address}</p>}
              {customer.city && <p className="buyer-detail">{customer.city}</p>}
              {customer.contact && customer.contact !== '—' && (
                <p className="buyer-detail">
                  Phone / Mobile: <strong style={{ color: '#0f172a' }}>{customer.contact}</strong>
                </p>
              )}
              {customer.gstin?.trim() ? (
                <p className="buyer-detail">
                  GSTIN: <strong style={{ color: '#1e40af' }}>{customer.gstin.trim()}</strong>
                </p>
              ) : null}
              {customer.state?.trim() ? (
                <p className="buyer-detail">State: {customer.state.trim()}{customer.state_code?.trim() ? ` (Code: ${customer.state_code.trim()})` : ''}</p>
              ) : null}
            </div>

            <div className="buyer-box">
              <h4>Dispatched / Delivery Via:</h4>
              <p className="buyer-name">{salesmanName}</p>
              <p className="buyer-detail">Vehicle Mode: Field Delivery Van / Van Spot Sale</p>
              <p className="buyer-detail">Payment Mode: {paymentMode}</p>
              {customer.contact && customer.contact !== '—' && (
                <p className="buyer-detail">Cust. Phone: <strong>{customer.contact}</strong></p>
              )}
              <p className="buyer-detail">
                Payment Status: <strong style={{ color: paymentStatus === 'Paid' ? '#15803d' : '#b45309' }}>{paymentStatus}</strong>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="gst-items-table">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>#</th>
                <th>Product Description</th>
                {settings.show_hsn && <th style={{ width: '70px', textAlign: 'center' }}>HSN</th>}
                <th style={{ width: '55px', textAlign: 'center' }}>Qty</th>
                <th style={{ width: '45px', textAlign: 'center' }}>Unit</th>
                <th style={{ width: '75px', textAlign: 'right' }}>MRP (₹)</th>
                <th style={{ width: '75px', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Taxable Value</th>
                {settings.show_gst_breakdown && (
                  <>
                    <th style={{ width: '70px', textAlign: 'right' }}>CGST</th>
                    <th style={{ width: '70px', textAlign: 'right' }}>SGST</th>
                  </>
                )}
                <th style={{ width: '95px', textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                    {item.package_type && <small style={{ color: '#64748b', display: 'block' }}>({item.package_type})</small>}
                  </td>
                  {settings.show_hsn && <td style={{ textAlign: 'center' }}>{item.hsn}</td>}
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ textAlign: 'right' }}>{item.mrp.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{item.taxable.toFixed(2)}</td>
                  {settings.show_gst_breakdown && (
                    <>
                      <td style={{ textAlign: 'right' }}>
                        {item.cgst > 0 ? `${item.cgst.toFixed(2)}` : '0.00'}
                        {item.gst_rate > 0 && <span style={{ color: '#64748b', display: 'block', fontSize: '9px' }}>({item.gst_rate / 2}%)</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.sgst > 0 ? `${item.sgst.toFixed(2)}` : '0.00'}
                        {item.gst_rate > 0 && <span style={{ color: '#64748b', display: 'block', fontSize: '9px' }}>({item.gst_rate / 2}%)</span>}
                      </td>
                    </>
                  )}
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom Grid: Bank, Terms, Totals, QR & Sign */}
          <div className="gst-bottom-grid">
            <div className="gst-terms-bank-col">
              <div className="amount-in-words-box" style={{ marginBottom: '10px' }}>
                <span className="words-label">Invoice Amount in Words:</span>
                <strong className="words-text">Indian Rupees {numberToWordsINR(grandTotal)} Only</strong>
              </div>

              {settings.show_bank_details && (
                <div className="print-bank-card">
                  <h5>Bank Account Details for NEFT / RTGS:</h5>
                  <p>Bank: <strong>{company.bank_name}</strong></p>
                  <p>Account Name: <strong>{company.account_holder}</strong></p>
                  <p>Account No: <strong>{company.account_number}</strong></p>
                  <p>IFSC Code: <strong>{company.ifsc_code}</strong> | Branch: {company.bank_branch}</p>
                </div>
              )}

              {settings.show_terms && (
                <div className="print-terms-card">
                  <h5>Terms & Conditions:</h5>
                  <pre>{company.terms_and_conditions}</pre>
                </div>
              )}
            </div>

            <div className="gst-calculation-col">
              <table className="calc-summary-table">
                <tbody>
                  <tr>
                    <td>Sub Total (Gross):</td>
                    <td className="text-right">₹{subtotalGross.toFixed(2)}</td>
                  </tr>
                  {totalDiscount > 0 && (
                    <tr className="total-discount-row">
                      <td><strong>Total Discount:</strong></td>
                      <td className="text-right text-danger"><strong>- ₹{totalDiscount.toFixed(2)}</strong></td>
                    </tr>
                  )}
                  <tr>
                    <td>Total Taxable Value:</td>
                    <td className="text-right">₹{totalTaxable.toFixed(2)}</td>
                  </tr>
                  {settings.show_gst_breakdown && (
                    <>
                      <tr>
                        <td>Central GST (CGST):</td>
                        <td className="text-right">+ ₹{totalCgst.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>State GST (SGST):</td>
                        <td className="text-right">+ ₹{totalSgst.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                  {roundOff !== 0 && (
                    <tr className="round-off-row" style={{ color: '#64748b', fontSize: '12px' }}>
                      <td>Round Off:</td>
                      <td className="text-right" style={{ color: roundOff > 0 ? '#15803d' : '#64748b' }}>
                        {roundOff > 0 ? `+ ₹${roundOff.toFixed(2)}` : `- ₹${Math.abs(roundOff).toFixed(2)}`}
                      </td>
                    </tr>
                  )}
                  <tr className="grand-total-row">
                    <td><strong>Invoice Grand Total:</strong></td>
                    <td className="text-right"><strong>₹{grandTotal.toFixed(2)}</strong></td>
                  </tr>
                  <tr>
                    <td>Amount Received ({paymentMode}):</td>
                    <td className="text-right" style={{ color: '#16a34a', fontWeight: '600' }}>
                      ₹{paidAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td>Balance Outstanding:</td>
                    <td className="text-right" style={{ color: balanceDue > 0 ? '#dc2626' : '#64748b', fontWeight: '700' }}>
                      ₹{balanceDue.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="print-qr-sign-row">
                {settings.show_upi_qr && company.upi_id && (
                  <div className="upi-qr-box">
                    {upiQrUrl ? (
                      <img 
                        src={upiQrUrl} 
                        alt="Scan & Pay via UPI" 
                        style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '4px', background: '#fff' }}
                      />
                    ) : (
                      <QrCode size={46} />
                    )}
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Scan &amp; Pay via UPI</span>
                    <span style={{ fontSize: '9px', color: '#1e40af' }}>({company.upi_id})</span>
                  </div>
                )}

                {settings.show_signature && (
                  <div className="signatory-box">
                    <p className="for-company">For {company.company_name}</p>
                    <div className="sign-space"></div>
                    <p className="sign-title">{settings.signature_label}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. NORMAL INVOICE PREVIEW (Non-GST / Commercial Bill of Supply) */}
      {currentTemplate === 'normal' && (
        <div className="printable-sheet a4-sheet normal-invoice-layout" id={id}>
          <div className="normal-header">
            <div>
              {settings.show_logo && company.logo_url && (
                <img src={company.logo_url} alt="Logo" className="invoice-header-logo" />
              )}
              <h2 className="company-print-title">{company.company_name}</h2>
              <p className="company-print-addr">{company.address_line1}, {company.city} - {company.pincode}</p>
              <p className="company-print-contacts">Phone: {company.phone} | Email: {company.email}</p>
            </div>
            <div className="normal-meta-box">
              <h3 className="norm-inv-badge">{stampTitle}</h3>
              <p>Bill #: <strong>{invoiceNo}</strong></p>
              <p>Date: <strong>{invoiceDate}</strong></p>
              <p>Executive: {salesmanName}</p>
            </div>
          </div>

          <div className="normal-customer-strip">
            <div>
              <strong>Customer:</strong> {customer.name} &bull; {customer.address}, {customer.city}
            </div>
            <div>
              <strong>Phone:</strong> {customer.contact}
            </div>
          </div>

          <table className="normal-items-table">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>#</th>
                <th>Item Description</th>
                <th style={{ textAlign: 'center', width: '85px' }}>Quantity</th>
                <th style={{ textAlign: 'right', width: '90px' }}>MRP (₹)</th>
                <th style={{ textAlign: 'right', width: '95px' }}>Price / Unit</th>
                <th style={{ textAlign: 'right', width: '105px' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{item.name}</strong></td>
                  <td style={{ textAlign: 'center' }}>{item.qty} {item.unit}</td>
                  <td style={{ textAlign: 'right' }}>₹{item.mrp.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="normal-footer-split">
            <div className="norm-terms">
              <p><strong>Terms:</strong> {company.terms_and_conditions.split('\n')[0]}</p>
              {settings.show_bank_details && (
                <p>
                  <strong>Pay to Bank:</strong> {company.bank_name} &bull; A/C: {company.account_number} &bull; IFSC: {company.ifsc_code}
                </p>
              )}
            </div>
            <div className="norm-totals-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                <span>Sub Total (Gross):</span>
                <span>₹{subtotalGross.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#dc2626', fontWeight: '600', marginBottom: '4px' }}>
                  <span>Total Discount:</span>
                  <span>- ₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {roundOff !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  <span>Round Off:</span>
                  <span style={{ color: roundOff > 0 ? '#15803d' : '#64748b' }}>
                    {roundOff > 0 ? `+ ₹${roundOff.toFixed(2)}` : `- ₹${Math.abs(roundOff).toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="norm-total-row">
                <span>Invoice Grand Total:</span>
                <strong>₹{grandTotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#16a34a' }}>
                <span>Paid ({paymentMode}):</span>
                <strong>₹{paidAmount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: balanceDue > 0 ? '#dc2626' : '#64748b' }}>
                <span>Balance Due:</span>
                <strong>₹{balanceDue.toFixed(2)}</strong>
              </div>
              {settings.show_signature && (
                <div className="norm-sign-space">
                  <span>Authorized Signatory</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3 & 4. MOBILE FIELD & THERMAL RECEIPT PREVIEW (POS 80mm / 58mm - Clean Thermal Format) */}
      {(currentTemplate === 'mobile' || currentTemplate === 'thermal') && (
        <div className={`thermal-roll-paper ${settings.thermal_width === '58mm' ? 'roll-58mm' : 'roll-80mm'}`} id={id}>
          <div className="thermal-center-header">
            {settings.show_logo && company.logo_url && (
              <img src={company.logo_url} alt="Logo" className="thermal-logo-img" />
            )}
            <h3 className="thermal-title">{company.company_name}</h3>
            {company.address_line1 && <p className="thermal-sub">{company.address_line1}{company.city ? `, ${company.city}` : ''}</p>}
            {company.gstin?.trim() ? <p className="thermal-sub">GSTIN: {company.gstin.trim()}</p> : null}
            {company.phone?.trim() ? <p className="thermal-sub">Tel: {company.phone.trim()}</p> : null}
            {settings.mobile_receipt_header ? <p className="thermal-sub" style={{ fontWeight: '700', color: '#1e3a8a', marginTop: '2px' }}>{settings.mobile_receipt_header}</p> : null}
            <div style={{ marginTop: '4px' }}>
              <span style={{ 
                display: 'inline-block', 
                fontSize: '10px', 
                fontWeight: '900', 
                padding: '2px 8px', 
                background: isInvoiceGst ? '#eff6ff' : '#f4f4f5', 
                color: isInvoiceGst ? '#1d4ed8' : '#18181b', 
                border: `1px solid ${isInvoiceGst ? '#bfdbfe' : '#e4e4e7'}`,
                borderRadius: '3px',
                textTransform: 'uppercase'
              }}>
                {stampTitle}
              </span>
            </div>
          </div>

          <div className="thermal-dash-line">========================================</div>
          <div className="thermal-meta">
            <div>INV: {invoiceNo}</div>
            <div>DATE & TIME: {invoiceDate}</div>
            <div>CUST: {customer.name.slice(0, 24)} {activeInvoice.customer_code ? `(${activeInvoice.customer_code})` : ''}</div>
            {customer.contact && customer.contact !== '—' && (
              <div>MOB: {customer.contact}</div>
            )}
            {customer.gstin ? (
              <div style={{ fontWeight: 'bold', color: '#1d4ed8' }}>GSTIN: {customer.gstin}</div>
            ) : null}
            <div>REP: {salesmanName.slice(0, 20)}</div>
          </div>
          <div className="thermal-dash-line">----------------------------------------</div>

          <table className="thermal-items-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '16px' }}>#</th>
                <th style={{ textAlign: 'left' }}>ITEM</th>
                <th style={{ textAlign: 'center', width: '28px' }}>QTY</th>
                <th style={{ textAlign: 'center', width: '30px' }}>UNIT</th>
                <th style={{ textAlign: 'right', width: '42px' }}>MRP</th>
                <th style={{ textAlign: 'right', width: '42px' }}>RATE</th>
                <th style={{ textAlign: 'right', width: '48px' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ verticalAlign: 'top' }}>
                  <td style={{ textAlign: 'left', padding: '3px 1px' }}>{idx + 1}</td>
                  <td style={{ textAlign: 'left', padding: '3px 2px', wordBreak: 'break-word', maxWidth: '105px' }}>
                    {wrapItemDescription13(item.name).map((line, lIdx) => (
                      <div key={lIdx} style={{ fontWeight: 'bold' }}>{line}</div>
                    ))}
                    {item.package_type && <small style={{ color: '#64748b', display: 'block', fontSize: '8px' }}>({item.package_type})</small>}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '3px 1px', whiteSpace: 'nowrap' }}>{item.qty}</td>
                  <td style={{ textAlign: 'center', color: '#64748b', padding: '3px 1px', whiteSpace: 'nowrap' }}>{item.unit}</td>
                  <td style={{ textAlign: 'right', padding: '3px 1px', whiteSpace: 'nowrap' }}>₹{item.mrp.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '3px 1px', whiteSpace: 'nowrap' }}>₹{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '3px 1px', whiteSpace: 'nowrap' }}>₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* GST Breakdown Table matching attached invoice image */}
          {isInvoiceGst && (
            <>
              <div className="thermal-dash-line">----------------------------------------</div>
              <div style={{ margin: '3px 0', border: '0.5px solid #a1a1aa', borderRadius: '3px', padding: '4px 6px', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr', fontSize: '8.5px', fontWeight: 'bold', borderBottom: '0.5px dashed #71717a', paddingBottom: '2px', color: '#0f172a' }}>
                  <span>GST%</span>
                  <span style={{ textAlign: 'right' }}>TaxableAmt</span>
                  <span style={{ textAlign: 'right' }}>CGSTAmt</span>
                  <span style={{ textAlign: 'right' }}>SGSTAmt</span>
                </div>
                {(() => {
                  const ratesMap = new Map();
                  items.forEach(it => {
                    const gRate = parseFloat(it.gst_rate) || 0;
                    if (gRate > 0) {
                      const taxable = it.taxable * discountFactor;
                      const cgst = taxable * (gRate / 200);
                      const sgst = taxable * (gRate / 200);
                      if (!ratesMap.has(gRate)) {
                        ratesMap.set(gRate, { taxable, cgst, sgst });
                      } else {
                        const prev = ratesMap.get(gRate);
                        prev.taxable += taxable;
                        prev.cgst += cgst;
                        prev.sgst += sgst;
                      }
                    }
                  });
                  if (ratesMap.size > 0) {
                    return Array.from(ratesMap.entries()).map(([gRate, val]) => (
                      <div key={gRate} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr', fontSize: '8.5px', paddingTop: '3px', color: '#18181b' }}>
                        <span>GST {gRate}%</span>
                        <span style={{ textAlign: 'right' }}>₹{val.taxable.toFixed(2)}</span>
                        <span style={{ textAlign: 'right' }}>₹{val.cgst.toFixed(2)}</span>
                        <span style={{ textAlign: 'right' }}>₹{val.sgst.toFixed(2)}</span>
                      </div>
                    ));
                  }
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr', fontSize: '8.5px', paddingTop: '3px', color: '#18181b' }}>
                      <span>GST {grossTaxable > 0 ? ((totalGst / (totalTaxable || 1)) * 100).toFixed(0) : '0'}%</span>
                      <span style={{ textAlign: 'right' }}>₹{totalTaxable.toFixed(2)}</span>
                      <span style={{ textAlign: 'right' }}>₹{totalCgst.toFixed(2)}</span>
                      <span style={{ textAlign: 'right' }}>₹{totalSgst.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          <div className="thermal-dash-line">----------------------------------------</div>
          <div className="thermal-totals-block">
            {totalDiscount > 0 && (
              <div className="t-row" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                <span>Total Discount:</span> <span>- ₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {isInvoiceGst && (
              <>
                <div className="t-row"><span>Total Taxable Value:</span> <span>₹{totalTaxable.toFixed(2)}</span></div>
                <div className="t-row" style={{ color: '#1d4ed8' }}><span>Central GST (CGST):</span> <span>+ ₹{totalCgst.toFixed(2)}</span></div>
                <div className="t-row" style={{ color: '#1d4ed8' }}><span>State GST (SGST):</span> <span>+ ₹{totalSgst.toFixed(2)}</span></div>
              </>
            )}
            <div className="t-row">
              <span style={{ color: '#475569' }}>Items: {items.length} ({items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0)} Units)</span>
              <span>Sub Total: ₹{subtotalGross.toFixed(2)}</span>
            </div>
            {roundOff !== 0 && (
              <div className="t-row" style={{ color: '#64748b', fontSize: '8.5px' }}>
                <span>Round Off:</span> <span>{roundOff > 0 ? `+ ₹${roundOff.toFixed(2)}` : `- ₹${Math.abs(roundOff).toFixed(2)}`}</span>
              </div>
            )}
            <div className="thermal-dash-line">========================================</div>
            <div className="t-row grand"><span>Invoice Grand Total:</span> <strong>₹{grandTotal.toFixed(2)}</strong></div>
            <div className="thermal-dash-line">========================================</div>
            <div className="t-row" style={{ color: '#15803d', fontWeight: 'bold' }}>
              <span>Amount Received ({paymentMode}):</span> <span>₹{paidAmount.toFixed(2)}</span>
            </div>
            <div className="t-row" style={{ color: balanceDue > 0 ? '#dc2626' : '#64748b', fontWeight: 'bold' }}>
              <span>Balance Outstanding:</span> <span>₹{balanceDue.toFixed(2)}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '10px', fontWeight: '800', color: balanceDue <= 0 ? '#15803d' : '#d97706' }}>
              [ {paymentStatus === 'Paid' ? 'PAID IN FULL' : 'PARTIAL SETTLEMENT'} ]
            </div>
          </div>

          {settings.show_upi_qr && company.upi_id && (
            <div className="thermal-qr-block" style={{ textAlign: 'center', margin: '8px 0' }}>
              {upiQrUrl ? (
                <img 
                  src={upiQrUrl} 
                  alt="Scan & Pay UPI QR" 
                  style={{ width: '96px', height: '96px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                />
              ) : (
                <QrCode size={48} />
              )}
              <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '4px 0 0 0' }}>UPI PAY: {company.upi_id}</p>
              <p style={{ fontSize: '9px', color: '#475569', margin: '1px 0 0 0' }}>Amount: ₹{grandTotal.toFixed(2)}</p>
            </div>
          )}

          <div className="thermal-footer">
            <p>{settings.mobile_receipt_footer || 'THANK YOU FOR YOUR BUSINESS!'}</p>
            <p>{settings.mobile_receipt_tagline ? `*** ${settings.mobile_receipt_tagline.toUpperCase()} ***` : '*** POWERED BY SOFTAIR SFA ***'}</p>
          </div>
          <div className="thermal-cut-guide">- - - - - - - - - - - [ CUT HERE ] - - - - - - - - - - -</div>
        </div>
      )}

      {/* 5. DOT MATRIX CONTINUOUS STATIONERY PREVIEW */}
      {currentTemplate === 'dotmatrix' && (
        <div className={`dot-matrix-stationery-sheet ${invoiceSettings.dot_matrix_columns === '132' ? 'dot-132' : 'dot-80'}`} id={id}>
          <div className="dot-matrix-inner-mono">
            <pre className="dot-text-screen">
{`+--------------------------------------------------------------------------------+
| ${((company.legal_name || company.company_name).toUpperCase()).padEnd(78)} |
| ${((company.address_line1 || '') + ', ' + (company.city || '')).padEnd(78)} |
| ${(company.gstin?.trim() ? `GSTIN: ${company.gstin.trim()}` : '').padEnd(26)} ${(company.state?.trim() ? `STATE: ${company.state.trim()}${company.state_code?.trim() ? ` (${company.state_code.trim()})` : ''}` : '').padEnd(26)} ${(company.phone?.trim() ? `PH: ${company.phone.trim()}` : '').padEnd(22)} |
+--------------------------------------------------------------------------------+
| INVOICE NO: ${invoiceNo.padEnd(20)} DATE: ${invoiceDate.padEnd(16)} DUE: ${dueDate.padEnd(16)} |
| CUSTOMER  : ${customer.name.slice(0, 35).padEnd(35)} GSTIN: ${(customer.gstin || '').padEnd(20)} |
| ADDRESS   : ${customer.address.slice(0, 78).padEnd(78)} |
+-----+----------------------------------+------+--------+--------+--------------+
| SL# | ITEM DESCRIPTION                 | HSN  | QTY    | RATE   | AMOUNT (INR) |
+-----+----------------------------------+------+--------+--------+--------------+
${items.map((item, idx) => {
  return `| ${String(idx + 1).padStart(3)} | ${item.name.slice(0, 32).padEnd(32)} | ${item.hsn.padEnd(4)} | ${String(item.qty).padStart(4)} ${item.unit.slice(0, 3)} | ${item.rate.toFixed(2).padStart(6)} | ${item.total.toFixed(2).padStart(12)} |`;
}).join('\n')}
+-----+----------------------------------+------+--------+--------+--------------+
| TOTAL TAXABLE VALUE: ₹${totalTaxable.toFixed(2).padEnd(14)}       CGST: ₹${totalCgst.toFixed(2).padEnd(10)} SGST: ₹${totalSgst.toFixed(2).padEnd(10)} |
${totalDiscount > 0 ? `| TOTAL DISCOUNT     : - INR ${totalDiscount.toFixed(2).padEnd(10)}                                         |\n` : ''}${roundOff !== 0 ? `| ROUND OFF          : ${(roundOff > 0 ? `+ INR ${roundOff.toFixed(2)}` : `- INR ${Math.abs(roundOff).toFixed(2)}`).padEnd(14)}                                   |\n` : ''}|                                                 ------------------------------ |
|                                                 GRAND TOTAL    : INR ${grandTotal.toFixed(2).padStart(10)} |
+--------------------------------------------------------------------------------+
| BANK DETAILS: ${(company.bank_name || '').padEnd(20)} A/C: ${(company.account_number || '').padEnd(20)} IFSC: ${(company.ifsc_code || '').padEnd(12)} |
| TERMS: 1. SUBJECT TO LOCAL JURISDICTION. 2. INTEREST @18% P.A. ON DELAYS.       |
|                                                     FOR ${((company.company_name).toUpperCase()).slice(0, 22).padEnd(22)} |
|                                                     [ AUTHORIZED SIGNATORY ]   |
+--------------------------------------------------------------------------------+`}
            </pre>
          </div>
        </div>
      )}

      {/* 6. CREDIT NOTE VOUCHER TEMPLATE */}
      {currentTemplate === 'credit_note' && (
        <div className="printable-sheet a4-sheet gst-invoice-layout credit-note-layout" id={id}>
          {/* Header Block */}
          <div className="gst-header-block">
            <div className="gst-company-brand">
              {settings.show_logo && company.logo_url && (
                <img src={company.logo_url} alt="Logo" className="invoice-header-logo" />
              )}
              <div>
                <h2 className="company-print-title">{company.legal_name || company.company_name}</h2>
                <p className="company-print-addr">
                  {company.address_line1}
                  {company.address_line2 && `, ${company.address_line2}`}
                  {company.city && `, ${company.city}`}
                  {company.state && ` - ${company.state}`}
                  {company.pincode && ` (${company.pincode})`}
                </p>
                <p className="company-print-contacts">
                  {company.gstin?.trim() ? (
                    <span>GSTIN: <strong>{company.gstin.trim()}</strong>{company.state?.trim() || company.phone?.trim() ? ' | ' : ''}</span>
                  ) : null}
                  {company.state?.trim() ? (
                    <span>State: <strong>{company.state.trim()}{company.state_code?.trim() ? ` (Code: ${company.state_code.trim()})` : ''}</strong>{company.phone?.trim() ? ' | ' : ''}</span>
                  ) : null}
                  {company.phone?.trim() ? (
                    <span>Phone: {company.phone.trim()}</span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="gst-invoice-meta">
              <div className="invoice-title-stamp credit-note-stamp" style={{ borderColor: '#0284c7', color: '#0284c7' }}>
                {settings.invoice_title || 'GST CREDIT NOTE'}
              </div>
              <table className="meta-compact-table">
                <tbody>
                  <tr><td>Credit Note #:</td><td><strong>{activeInvoice.credit_note_number || invoiceNo.replace('INV-', 'CN-')}</strong></td></tr>
                  <tr><td>Credit Date:</td><td><strong>{activeInvoice.credit_note_date ? formatInvoiceDateOnly(activeInvoice.credit_note_date) : invoiceDate}</strong></td></tr>
                  <tr><td>Original Inv #:</td><td><strong>{activeInvoice.invoice_number || 'INV-2026-0042'}</strong></td></tr>
                  <tr><td>Reason:</td><td>{activeInvoice.reason || 'Sales Return / Rate Difference'}</td></tr>
                  <tr><td>Section:</td><td>Sec 34 CGST Act</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer / Credit To Details */}
          <div className="gst-buyer-grid">
            <div className="buyer-box">
              <h4>Credit Allowed To (Customer Details):</h4>
              <p className="buyer-name">{customer.name} {activeInvoice.customer_code ? `(${activeInvoice.customer_code})` : ''}</p>
              {customer.address && <p className="buyer-detail">{customer.address}</p>}
              {customer.city && <p className="buyer-detail">{customer.city}</p>}
              {customer.contact && customer.contact !== '—' && (
                <p className="buyer-detail">
                  Phone / Mobile: <strong style={{ color: '#0f172a' }}>{customer.contact}</strong>
                </p>
              )}
              {customer.gstin?.trim() ? (
                <p className="buyer-detail">
                  GSTIN: <strong style={{ color: '#1e40af' }}>{customer.gstin.trim()}</strong>
                </p>
              ) : null}
              {customer.state?.trim() ? (
                <p className="buyer-detail">State: {customer.state.trim()}{customer.state_code?.trim() ? ` (Code: ${customer.state_code.trim()})` : ''}</p>
              ) : null}
            </div>

            <div className="buyer-box">
              <h4>Adjustment &amp; Reference Details:</h4>
              <p className="buyer-name">Original Invoice: {activeInvoice.invoice_number || 'INV-2026-0042'}</p>
              <p className="buyer-detail">Credit Reason: <strong>{activeInvoice.reason || 'Sales Return / Damage'}</strong></p>
              <p className="buyer-detail">Ledger Effect: <strong>Deducted from Customer Outstanding Balance</strong></p>
              <p className="buyer-detail">
                Status: <strong style={{ color: '#059669' }}>{activeInvoice.status || 'Approved & Adjusted'}</strong>
              </p>
              {activeInvoice.notes && <p className="buyer-detail" style={{ fontStyle: 'italic' }}>Note: {activeInvoice.notes}</p>}
            </div>
          </div>

          {/* Items / Adjustment Table */}
          <table className="gst-items-table">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>#</th>
                <th>Item / Return Description</th>
                {settings.show_hsn && <th style={{ width: '70px' }}>HSN</th>}
                <th style={{ width: '60px' }}>Qty</th>
                <th style={{ width: '50px' }}>Unit</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Taxable Val</th>
                {settings.show_gst_breakdown && (
                  <>
                    <th style={{ width: '65px', textAlign: 'right' }}>CGST</th>
                    <th style={{ width: '65px', textAlign: 'right' }}>SGST</th>
                  </>
                )}
                <th style={{ width: '90px', textAlign: 'right' }}>Credit Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                    <small style={{ color: '#64748b', display: 'block' }}>Return credit adjustment</small>
                  </td>
                  {settings.show_hsn && <td>{item.hsn}</td>}
                  <td>{item.qty}</td>
                  <td>{item.unit}</td>
                  <td style={{ textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{item.taxable.toFixed(2)}</td>
                  {settings.show_gst_breakdown && (
                    <>
                      <td style={{ textAlign: 'right' }}>₹{item.cgst.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.sgst.toFixed(2)}</td>
                    </>
                  )}
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Calculation Block */}
          <div className="gst-calculation-section">
            <div className="gst-words-left">
              <div className="amount-in-words-box">
                <span className="words-label">Total Credit in Words:</span>
                <strong className="words-text">Indian Rupees {numberToWordsINR(grandTotal)} Only</strong>
              </div>
              <div className="statutory-gst-box">
                <strong>Statutory ITC Reversal Notice:</strong>
                <p style={{ margin: '2px 0 0 0' }}>
                  This Credit Note is issued in accordance with GST statutory laws. The recipient is required to reverse the corresponding Input Tax Credit (ITC) if availed on the original invoice.
                </p>
              </div>
            </div>

            <div className="gst-totals-table-box">
              <table className="gst-totals-table">
                <tbody>
                  <tr><td>Total Taxable Value:</td><td>₹{totalTaxable.toFixed(2)}</td></tr>
                  {settings.show_gst_breakdown && (
                    <>
                      <tr><td>Central GST (CGST):</td><td>₹{totalCgst.toFixed(2)}</td></tr>
                      <tr><td>State GST (SGST):</td><td>₹{totalSgst.toFixed(2)}</td></tr>
                      <tr><td>Total GST Reversal:</td><td>₹{totalGst.toFixed(2)}</td></tr>
                    </>
                  )}
                  <tr className="grand-total-row">
                    <td>TOTAL CREDIT AMOUNT:</td>
                    <td>₹{grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer & Signatures */}
          <div className="gst-footer-signatures">
            <div className="terms-col">
              <h5>Terms &amp; Conditions:</h5>
              <pre className="cn-terms-pre">{company.credit_note_terms || settings.credit_note_terms || '1. Amount credited to customer ledger balance.\n2. Subject to product quality verification.\n3. Subject to local jurisdiction.'}</pre>
            </div>
            <div className="signature-col">
              <div className="signature-box-inner">
                {settings.show_signature && company.signature_url && (
                  <img src={company.signature_url} alt="Signature" className="auth-signature-img" />
                )}
                <div className="sign-line"></div>
                <p className="auth-label">{settings.signature_label || 'Authorized Signatory'}</p>
                <p className="company-sign-name">For {company.company_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. PURCHASE ORDER DOCUMENT TEMPLATE */}
      {currentTemplate === 'purchase_order' && (
        <div className="printable-sheet a4-sheet gst-invoice-layout purchase-order-layout" id={id}>
          {/* Header Block */}
          <div className="gst-header-block">
            <div className="gst-company-brand">
              {settings.show_logo && company.logo_url && (
                <img src={company.logo_url} alt="Logo" className="invoice-header-logo" />
              )}
              <div>
                <h2 className="company-print-title">{company.legal_name || company.company_name}</h2>
                <p className="company-print-addr">
                  {company.address_line1}
                  {company.address_line2 && `, ${company.address_line2}`}
                  {company.city && `, ${company.city}`}
                  {company.state && ` - ${company.state}`}
                  {company.pincode && ` (${company.pincode})`}
                </p>
                <p className="company-print-contacts">
                  {company.gstin?.trim() ? (
                    <span>GSTIN: <strong>{company.gstin.trim()}</strong>{company.state?.trim() || company.phone?.trim() ? ' | ' : ''}</span>
                  ) : null}
                  {company.state?.trim() ? (
                    <span>State: <strong>{company.state.trim()}{company.state_code?.trim() ? ` (Code: ${company.state_code.trim()})` : ''}</strong>{company.phone?.trim() ? ' | ' : ''}</span>
                  ) : null}
                  {company.phone?.trim() ? (
                    <span>Phone: {company.phone.trim()}</span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="gst-invoice-meta">
              <div className="invoice-title-stamp purchase-order-stamp" style={{ borderColor: '#16a34a', color: '#16a34a' }}>
                {settings.invoice_title || 'PURCHASE ORDER'}
              </div>
              <table className="meta-compact-table">
                <tbody>
                  <tr><td>PO Number:</td><td><strong>{activeInvoice.po_number || invoiceNo.replace('INV-', 'PO-')}</strong></td></tr>
                  <tr><td>PO Date:</td><td><strong>{activeInvoice.order_date ? formatInvoiceDateOnly(activeInvoice.order_date) : invoiceDate}</strong></td></tr>
                  <tr><td>Expected Date:</td><td><strong>{activeInvoice.expected_delivery_date ? formatInvoiceDateOnly(activeInvoice.expected_delivery_date) : 'Immediate / On Dispatch'}</strong></td></tr>
                  <tr><td>Warehouse:</td><td>{activeInvoice.warehouse_name || '—'}</td></tr>
                  <tr><td>Status:</td><td><strong style={{ color: '#15803d' }}>{activeInvoice.status || 'Approved'}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor / Destination Warehouse Details */}
          <div className="gst-buyer-grid">
            <div className="buyer-box">
              <h4>Vendor / Supplier Details:</h4>
              <p className="buyer-name">{activeInvoice.vendor_name || 'Supplier'}</p>
              {activeInvoice.vendor_code && <p className="buyer-detail">Vendor Code: <strong>{activeInvoice.vendor_code}</strong></p>}
              {activeInvoice.vendor_address && <p className="buyer-detail">Address: {activeInvoice.vendor_address}</p>}
              {activeInvoice.vendor_gstin && <p className="buyer-detail">GSTIN: <strong style={{ color: '#1e40af' }}>{activeInvoice.vendor_gstin}</strong></p>}
              {activeInvoice.vendor_phone && <p className="buyer-detail">Contact / Phone: {activeInvoice.vendor_phone}</p>}
            </div>

            <div className="buyer-box">
              <h4>Ship To / Destination Warehouse:</h4>
              <p className="buyer-name">{activeInvoice.warehouse_name || company.company_name || 'Main Warehouse Depot'}</p>
              <p className="buyer-detail">Delivery Address: {company.address_line1 || company.city || 'Designated Receiving Gate'}</p>
              {company.city && <p className="buyer-detail">City &amp; State: {company.city}{company.state ? `, ${company.state}` : ''}{company.pincode ? ` - ${company.pincode}` : ''}</p>}
              {company.phone && <p className="buyer-detail">Inward Contact: {company.phone}</p>}
              <p className="buyer-detail">Delivery Instructions: <strong>F.O.R. Destination Gate Inspection</strong></p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="gst-items-table">
            <thead>
              <tr>
                <th style={{ width: '35px' }}>#</th>
                <th>Product Description &amp; SKU</th>
                {settings.show_hsn && <th style={{ width: '70px' }}>HSN</th>}
                <th style={{ width: '60px' }}>Qty</th>
                <th style={{ width: '60px' }}>Package</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Unit Rate (₹)</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Taxable Val</th>
                {settings.show_gst_breakdown && (
                  <>
                    <th style={{ width: '65px', textAlign: 'right' }}>CGST</th>
                    <th style={{ width: '65px', textAlign: 'right' }}>SGST</th>
                  </>
                )}
                <th style={{ width: '90px', textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                    {item.hsn && <small style={{ color: '#64748b', display: 'block' }}>SKU: {item.hsn}</small>}
                  </td>
                  {settings.show_hsn && <td>{item.hsn}</td>}
                  <td style={{ fontWeight: '600' }}>{item.qty}</td>
                  <td>{item.package_type || item.unit}</td>
                  <td style={{ textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{item.taxable.toFixed(2)}</td>
                  {settings.show_gst_breakdown && (
                    <>
                      <td style={{ textAlign: 'right' }}>₹{item.cgst.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{item.sgst.toFixed(2)}</td>
                    </>
                  )}
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Calculation Block */}
          <div className="gst-calculation-section">
            <div className="gst-words-left">
              <div className="amount-in-words-box">
                <span className="words-label">PO Value in Words:</span>
                <strong className="words-text">Indian Rupees {numberToWordsINR(grandTotal)} Only</strong>
              </div>
              <div className="statutory-gst-box po-terms-box">
                <strong>Procurement Terms &amp; Conditions:</strong>
                <pre className="po-terms-pre">{company.purchase_order_terms || settings.purchase_order_terms || '1. Mention this PO Number on all Delivery Challans and Invoices.\n2. Materials subject to physical inspection & batch testing at inward gate.\n3. Payment will be released within 30 days of GRN generation.'}</pre>
              </div>
            </div>

            <div className="gst-totals-table-box">
              <table className="gst-totals-table">
                <tbody>
                  <tr><td>Total Taxable Value:</td><td>₹{totalTaxable.toFixed(2)}</td></tr>
                  {settings.show_gst_breakdown && (
                    <>
                      <tr><td>Estimated CGST:</td><td>₹{totalCgst.toFixed(2)}</td></tr>
                      <tr><td>Estimated SGST:</td><td>₹{totalSgst.toFixed(2)}</td></tr>
                    </>
                  )}
                  {totalDiscount > 0 && (
                    <tr style={{ color: '#dc2626' }}>
                      <td><strong>Total Discount:</strong></td>
                      <td>- ₹{totalDiscount.toFixed(2)}</td>
                    </tr>
                  )}
                  {roundOff !== 0 && (
                    <tr style={{ color: '#64748b', fontSize: '12px' }}>
                      <td>Round Off:</td>
                      <td>{roundOff > 0 ? `+ ₹${roundOff.toFixed(2)}` : `- ₹${Math.abs(roundOff).toFixed(2)}`}</td>
                    </tr>
                  )}
                  <tr className="grand-total-row">
                    <td>TOTAL PURCHASE ORDER VALUE:</td>
                    <td>₹{grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer & Dual Signatures */}
          <div className="gst-footer-signatures po-dual-signatures">
            <div className="terms-col signature-col-left">
              <div className="signature-box-inner" style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>Acknowledged &amp; Accepted By Supplier:</p>
                <div className="sign-line"></div>
                <p className="auth-label">Supplier Authorized Representative</p>
                <p className="company-sign-name">Date &amp; Official Stamp</p>
              </div>
            </div>
            <div className="signature-col signature-col-right">
              <div className="signature-box-inner" style={{ textAlign: 'right' }}>
                {settings.show_signature && company.signature_url && (
                  <img src={company.signature_url} alt="Signature" className="auth-signature-img" />
                )}
                <div className="sign-line"></div>
                <p className="auth-label">{settings.signature_label || 'Purchase Manager / Signatory'}</p>
                <p className="company-sign-name">For {company.company_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
