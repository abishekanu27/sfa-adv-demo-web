import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Building2, 
  Palette, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Check, 
  Save, 
  Sparkles,
  Trash2,
  Zap,
  Eye
} from 'lucide-react';
import { updateCompanySettingsApi } from '../services/api';

const COLOR_SWATCHES = [
  { name: 'Royal Blue', color: '#3b82f6' },
  { name: 'Deep Indigo', color: '#4f46e5' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Ruby Rose', color: '#e11d48' },
  { name: 'Amber Gold', color: '#f59e0b' },
  { name: 'Slate Dark', color: '#1e293b' },
];

export const CompanyBrandingModal = ({ isOpen, onClose, currentSettings, onSettingsSaved }) => {
  const [formData, setFormData] = useState({
    company_name: currentSettings?.company_name || '',
    portal_title: currentSettings?.portal_title || '',
    tagline: currentSettings?.tagline || '',
    logo_url: currentSettings?.logo_url || '',
    primary_color: currentSettings?.primary_color || '#3b82f6',
    secondary_color: currentSettings?.secondary_color || '#6366f1',
    email: currentSettings?.email || '',
    phone: currentSettings?.phone || '',
    address: currentSettings?.address || '',
    tax_id: currentSettings?.tax_id || '',
    currency: currentSettings?.currency || 'INR (₹)'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB. Please choose a smaller logo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleInputChange('logo_url', reader.result);
      setErrorMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    handleInputChange('logo_url', '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await updateCompanySettingsApi(formData);
      if (response && response.success) {
        setSaveSuccess(true);
        onSettingsSaved(response.settings);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      } else {
        throw new Error(response.message || 'Failed to save');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error saving settings to PostgreSQL.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '32px',
          position: 'relative',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${formData.primary_color}18`, color: formData.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Company Branding & Portal Settings</h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Customize your company logo, name, colors & details stored in PostgreSQL</p>
            </div>
          </div>
          <button
            id="close-branding-modal"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ padding: '10px 16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px', marginBottom: '18px' }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
            {/* Left Column: Form Fields */}
            <div>
              {/* Logo Upload Section */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '8px', color: '#334155' }}>
                  Company Logo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '18px',
                      background: formData.logo_url ? '#ffffff' : `linear-gradient(135deg, ${formData.primary_color} 0%, ${formData.secondary_color} 100%)`,
                      border: '2px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                    }}
                  >
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                    ) : (
                      <Zap size={32} fill="#fbbf24" stroke="#fbbf24" />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="company-logo-file-input"
                    />
                    <button
                      type="button"
                      id="upload-logo-btn"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={14} />
                      Upload Logo Image
                    </button>
                    {formData.logo_url && (
                      <button
                        type="button"
                        id="remove-logo-btn"
                        onClick={handleRemoveLogo}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <Trash2 size={12} />
                        Reset to default lightning icon
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Name & Portal Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                    Company Name
                  </label>
                  <input
                    id="branding-company-name"
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#f8fafc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                    Portal Title
                  </label>
                  <input
                    id="branding-portal-title"
                    type="text"
                    required
                    value={formData.portal_title}
                    onChange={(e) => handleInputChange('portal_title', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#f8fafc' }}
                  />
                </div>
              </div>

              {/* Tagline */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
                  Business Tagline / Subtitle
                </label>
                <input
                  id="branding-tagline"
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#f8fafc' }}
                />
              </div>

              {/* Primary Color Palette */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
                  Brand Primary Color Theme
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      onClick={() => handleInputChange('primary_color', swatch.color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: swatch.color,
                        border: formData.primary_color === swatch.color ? '3px solid #ffffff' : 'none',
                        boxShadow: formData.primary_color === swatch.color ? `0 0 0 2px ${swatch.color}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}
                      title={swatch.name}
                    >
                      {formData.primary_color === swatch.color && <Check size={14} strokeWidth={3} />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                    title="Custom Color Picker"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', color: '#64748b' }}>
                    Corporate Email
                  </label>
                  <input
                    id="branding-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', color: '#64748b' }}>
                    Phone Number
                  </label>
                  <input
                    id="branding-phone"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', color: '#64748b' }}>
                  Office / Billing Address
                </label>
                <input
                  id="branding-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc' }}
                />
              </div>
            </div>

            {/* Right Column: Live Login Card Preview */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '16px' }}>
                <Eye size={14} />
                <span>Live Login Card Preview</span>
              </div>

              {/* Miniature Login Card */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '24px 20px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Logo */}
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: formData.logo_url ? '#ffffff' : `linear-gradient(135deg, ${formData.secondary_color} 0%, ${formData.primary_color} 100%)`,
                    border: formData.logo_url ? '1px solid #e2e8f0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 6px 16px ${formData.primary_color}33`,
                    marginBottom: '12px',
                    overflow: 'hidden'
                  }}
                >
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Zap size={22} fill="#fbbf24" stroke="#fbbf24" />
                  )}
                </div>

                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: '14px' }}>
                  {formData.portal_title || 'ERP Portal'}
                </div>

                {/* Simulated Input 1 */}
                <div style={{ width: '100%', height: '34px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', marginBottom: '10px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '11px', color: '#94a3b8' }}>
                  Enter your username or email
                </div>

                {/* Simulated Input 2 */}
                <div style={{ width: '100%', height: '34px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '11px', color: '#94a3b8' }}>
                  ••••••••
                </div>

                {/* Simulated Button */}
                <div
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '10px',
                    background: formData.primary_color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    boxShadow: `0 4px 12px ${formData.primary_color}44`
                  }}
                >
                  Sign In to ERP
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              id="cancel-branding-btn"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              id="save-branding-btn"
              disabled={isSaving}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                background: formData.primary_color,
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${formData.primary_color}44`
              }}
            >
              {isSaving ? (
                'Saving to PostgreSQL...'
              ) : saveSuccess ? (
                <>
                  <Check size={16} />
                  <span>Saved to PostgreSQL!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Company Branding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
