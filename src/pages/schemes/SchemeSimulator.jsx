import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Gift, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  SlidersHorizontal,
  Package,
  Percent,
  DollarSign
} from 'lucide-react';
import { fetchProductsApi, evaluateSchemesApi } from '../../services/api';

export const SchemeSimulator = () => {
  const [products, setProducts] = useState([]);
  const [loadingProds, setLoadingProds] = useState(false);

  // Cart simulation state
  const [simCartItems, setSimCartItems] = useState([
    { product_id: '', name: '', qty: 1, package_type: 'Bag', unit: 'Bag', rate: 400, total: 400 }
  ]);
  const [manualOrderExtra, setManualOrderExtra] = useState(0);

  // Evaluation Output
  const [evalResult, setEvalResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    setLoadingProds(true);
    fetchProductsApi().then(prods => {
      setProducts(prods || []);
      if (prods && prods.length > 0) {
        const first = prods[0];
        const pkg = first.package_type || 'Bag';
        const boxRate = parseFloat(first.box_price || (first.selling_price * (first.items_per_package || 10))) || 400;
        setSimCartItems([
          {
            product_id: String(first.product_id || first.id),
            name: first.name,
            qty: 1,
            package_type: pkg,
            unit: pkg,
            rate: boxRate,
            total: boxRate
          }
        ]);
      }
    }).catch(err => {
      console.warn('Simulator products load:', err);
    }).finally(() => {
      setLoadingProds(false);
    });
  }, []);

  // Calculate gross total
  const itemsSubtotal = simCartItems.reduce((acc, it) => acc + (parseFloat(it.total) || 0), 0);
  const grossTotal = Math.round((itemsSubtotal + (parseFloat(manualOrderExtra) || 0)) * 100) / 100;

  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const payload = {
        items: simCartItems.map(it => ({
          product_id: it.product_id,
          name: it.name,
          qty: parseFloat(it.qty) || 1,
          package_type: it.package_type || 'Loose',
          unit: it.unit || 'Pcs',
          rate: parseFloat(it.rate) || 0,
          total: parseFloat(it.total) || 0
        })),
        total_amount: grossTotal
      };

      const res = await evaluateSchemesApi(payload);
      setEvalResult(res);
    } catch (err) {
      console.error('Failed to evaluate schemes:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, [simCartItems, manualOrderExtra]);

  const handleProductChange = (idx, prodId) => {
    const prod = products.find(p => String(p.product_id || p.id) === String(prodId));
    setSimCartItems(prev => {
      const next = [...prev];
      const pkg = prod?.package_type || 'Bag';
      const r = prod ? (parseFloat(prod.box_price || prod.selling_price) || 0) : 0;
      const q = next[idx].qty || 1;
      next[idx] = {
        ...next[idx],
        product_id: prodId,
        name: prod ? prod.name : '',
        package_type: pkg,
        unit: pkg,
        rate: r,
        total: Math.round(q * r * 100) / 100
      };
      return next;
    });
  };

  const handleUnitChange = (idx, newUnit) => {
    const it = simCartItems[idx];
    const prod = products.find(p => String(p.product_id || p.id) === String(it.product_id));
    const isPack = newUnit === 'Bag' || newUnit === 'Box' || newUnit === 'Carton';
    
    let rate = parseFloat(it.rate) || 0;
    if (prod) {
      rate = isPack 
        ? parseFloat(prod.box_price || (prod.selling_price * (prod.items_per_package || 10))) 
        : parseFloat(prod.selling_price || prod.mrp);
    }

    setSimCartItems(prev => {
      const next = [...prev];
      const q = next[idx].qty || 1;
      next[idx] = {
        ...next[idx],
        package_type: newUnit,
        unit: newUnit,
        rate: rate,
        total: Math.round(q * rate * 100) / 100
      };
      return next;
    });
  };

  const handleQtyChange = (idx, qVal) => {
    const q = Math.max(1, parseFloat(qVal) || 1);
    setSimCartItems(prev => {
      const next = [...prev];
      const r = next[idx].rate || 0;
      next[idx] = {
        ...next[idx],
        qty: q,
        total: Math.round(q * r * 100) / 100
      };
      return next;
    });
  };

  const handleAddItem = () => {
    if (products.length > 0) {
      const p = products[0];
      const r = parseFloat(p.selling_price || p.mrp || 0);
      setSimCartItems(prev => [
        ...prev,
        {
          product_id: String(p.product_id || p.id),
          name: p.name,
          qty: 1,
          package_type: 'Pcs',
          unit: 'Pcs',
          rate: r,
          total: r
        }
      ]);
    }
  };

  const handleRemoveItem = (idx) => {
    if (simCartItems.length <= 1) return;
    setSimCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="schemes-hub-page">
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={18} color="#4f46e5" />
            <span>Scheme Simulator &amp; Real-Time Unit Conversion Tester</span>
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Simulate purchases in <strong>Bags, Boxes, or Pieces</strong> and test thresholds like <strong>₹5,000+ Free Bag</strong> or <strong>₹10,000+ 5% Discount</strong> live.
          </p>
        </div>

        <button 
          type="button" 
          onClick={runEvaluation} 
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: '600',
            color: '#334155',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={isEvaluating ? 'spin' : ''} />
          <span>Re-Evaluate</span>
        </button>
      </div>

      <div className="simulator-container">
        {/* Left: Input Cart Sandbox */}
        <div className="simulator-box">
          <h3>
            <span>1. Simulated Customer Cart</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {simCartItems.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 80px 80px 80px 32px', gap: '8px', alignItems: 'center' }}>
                <select
                  className="scheme-form-input"
                  style={{ fontSize: '12px' }}
                  value={item.product_id}
                  onChange={e => handleProductChange(idx, e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.product_id || p.id} value={p.product_id || p.id}>
                      {p.name} ({p.items_per_package || 10} pcs/{p.package_type || 'Bag'})
                    </option>
                  ))}
                </select>

                <input 
                  type="number"
                  min="1"
                  step="1"
                  className="scheme-form-input"
                  style={{ fontSize: '12px' }}
                  placeholder="Qty"
                  value={item.qty}
                  onChange={e => handleQtyChange(idx, e.target.value)}
                />

                <select
                  className="scheme-form-input"
                  style={{ fontSize: '12px' }}
                  value={item.package_type}
                  onChange={e => handleUnitChange(idx, e.target.value)}
                >
                  <option value="Bag">Bag</option>
                  <option value="Box">Box</option>
                  <option value="Pcs">Pcs</option>
                </select>

                <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', textAlign: 'right' }}>
                  ₹{(item.total || 0).toFixed(2)}
                </div>

                <button 
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button 
              type="button" 
              onClick={handleAddItem}
              style={{
                alignSelf: 'flex-start',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px dashed #bfdbfe',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={14} />
              <span>Add Cart Product</span>
            </button>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
              Additional Order Amount from other items (₹)
            </label>
            <input 
              type="number"
              step="500"
              min="0"
              className="scheme-form-input"
              value={manualOrderExtra}
              onChange={e => setManualOrderExtra(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 5000 to test Total Amount-Based Schemes"
            />
            <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Simulates cart total to test thresholds like ₹5,000+ or ₹10,000+.
            </span>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Simulated Bill Value:</span>
            <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              ₹{grossTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right: Engine Evaluation Output */}
        <div className="simulator-box" style={{ background: '#fdfbfb' }}>
          <h3>
            <Sparkles size={18} color="#059669" />
            <span>2. Engine Evaluation Output</span>
          </h3>

          {!evalResult || (!evalResult.matched_schemes?.length && !evalResult.free_reward_items?.length && !evalResult.discount_amount) ? (
            <div style={{
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '30px 20px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <p style={{ margin: 0, fontSize: '13px' }}>
                No active scheme rules qualified for this purchase combination.
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Tip: Buy 1 Bag of qualifying product, or increase simulated bill amount to ₹5,000+ to see automatic rewards!
              </p>
            </div>
          ) : (
            <div>
              {/* Triggered Schemes */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Qualified Scheme Rules ({evalResult.matched_schemes.length})
                </span>

                {evalResult.matched_schemes.map((m, i) => (
                  <div key={i} style={{
                    background: '#ffffff',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: '#166534' }}>{m.name}</strong>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', background: '#ecfdf5', color: '#15803d', padding: '1px 6px', borderRadius: '4px' }}>
                        {m.scheme_code}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      {m.trigger_summary} $\rightarrow$ <strong style={{ color: '#15803d' }}>{m.reward_summary}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Free Goods */}
              {evalResult.free_reward_items?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Free Reward Goods Injected ({evalResult.free_reward_items.length})
                  </span>

                  {evalResult.free_reward_items.map((it, i) => (
                    <div key={i} className="sim-reward-card">
                      <div className="sim-reward-left">
                        <Gift size={20} color="#16a34a" />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                            {it.qty} {it.unit || 'Pcs'} of {it.product_name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            Linked to Scheme: {it.scheme_name}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="sim-free-tag">Free (₹0.00)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Applied Discount */}
              {evalResult.discount_amount > 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Percent size={18} color="#d97706" />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#b45309' }}>
                      Scheme Discount Applied:
                    </span>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#b45309' }}>
                    -₹{evalResult.discount_amount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Status Note */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>Inventory is correctly tracked while customer receives the scheme reward!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
