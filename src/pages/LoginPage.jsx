import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  AlertCircle,
  Building2,
  Clock,
  X
} from 'lucide-react';
import { loginApi, fetchCompanySettings } from '../services/api';
import { DISPLAY_VERSION } from '../version';
import './LoginPage.css';

export const LoginPage = ({ onLoginSuccess, idleMessage }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessLoading, setIsSuccessLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [visibleIdleMsg, setVisibleIdleMsg] = useState(idleMessage || '');

  useEffect(() => {
    if (idleMessage) {
      setVisibleIdleMsg(idleMessage);
    }
  }, [idleMessage]);

  const [companySettings, setCompanySettings] = useState(() => {
    try {
      const cached = localStorage.getItem('salesforce_company_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      company_name: '',
      legal_name: '',
      portal_title: 'SalesForce ERP Portal',
      tagline: '',
      logo_url: '',
      primary_color: '#2563eb'
    };
  });

  useEffect(() => {
    fetchCompanySettings().then(settings => {
      if (settings) {
        setCompanySettings(settings);
      }
    });

    const handleUpdate = (e) => {
      if (e.detail) setCompanySettings(e.detail);
    };
    window.addEventListener('companySettingsUpdated', handleUpdate);
    return () => window.removeEventListener('companySettingsUpdated', handleUpdate);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!emailOrUsername.trim() || !password) {
      setErrorMessage('Please enter your username and password.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginApi(emailOrUsername, password, true);
      if (response && response.success) {
        setIsSuccessLoading(true);
        setLoggedInUser(response.user);

        // Hold the loading animation for smooth transition feedback
        setTimeout(() => {
          onLoginSuccess(response.user, response.token);
        }, 1200);
      } else {
        setIsLoading(false);
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Invalid username or password.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="reerui-login-page">
      {/* Framed Window Container */}
      <div className="reerui-window-frame">
        {isSuccessLoading ? (
          /* Loading Screen Once Logged In */
          <div className="reerui-success-loader">
            <div className="reerui-loader-brand">
              <img 
                src="/SoftAir_SFA.png" 
                className="reerui-loader-logo" 
                alt="SoftAir SFA"
                style={{ maxHeight: '70px', width: 'auto', objectFit: 'contain' }}
              />
            </div>

            <div className="reerui-loader-spinner-ring">
              <div className="reerui-ring-track" />
              <div className="reerui-ring-head" />
            </div>

            <h2 className="reerui-loader-title">Logging In...</h2>
            <p className="reerui-loader-subtitle">
              Welcome back{loggedInUser?.full_name ? `, ${loggedInUser.full_name}` : loggedInUser?.username ? `, ${loggedInUser.username}` : ''}! Preparing your workspace...
            </p>

            <div className="reerui-loader-progress-track">
              <div className="reerui-loader-progress-fill" />
            </div>
          </div>
        ) : (
          <>
            {/* Top Header / Company Brand */}
            <header className="reerui-header">
              <div className="reerui-brand-wrap" style={{ justifyContent: 'center' }}>
                <img 
                  src="/SoftAir_SFA.png" 
                  className="reerui-brand-logo" 
                  alt="SoftAir SFA"
                  style={{ maxHeight: '65px', width: 'auto', objectFit: 'contain' }}
                />
              </div>
            </header>

            {/* Main Centered Grid */}
            <div className="reerui-main-grid">
              {/* Form Area */}
              <div className="reerui-form-side">
                <h1 className="reerui-title">Login</h1>

                {/* Idle Logout Notification */}
                {visibleIdleMsg && (
                  <div className="reerui-idle-alert">
                    <div className="reerui-idle-content">
                      <Clock size={16} />
                      <span>{visibleIdleMsg}</span>
                    </div>
                    <button
                      type="button"
                      className="reerui-idle-close"
                      onClick={() => setVisibleIdleMsg('')}
                      aria-label="Dismiss idle notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className={`reerui-error-alert ${isShaking ? 'animate-shake' : ''}`}>
                    <AlertCircle size={15} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className={`reerui-form ${isShaking ? 'animate-shake' : ''}`} noValidate>
                  {/* Username Field */}
                  <div className="reerui-field-group">
                    <label htmlFor="reerui-email-input" className="reerui-field-label">
                      Username
                    </label>
                    <div className="reerui-input-wrapper">
                      <input
                        id="reerui-email-input"
                        type="text"
                        required
                        disabled={isLoading}
                        className="reerui-underline-input"
                        placeholder="Enter your username"
                        value={emailOrUsername}
                        onChange={(e) => {
                          setEmailOrUsername(e.target.value);
                          if (visibleIdleMsg) setVisibleIdleMsg('');
                        }}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="reerui-field-group">
                    <label htmlFor="reerui-password-input" className="reerui-field-label">
                      Password
                    </label>
                    <div className="reerui-input-wrapper">
                      <input
                        id="reerui-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={isLoading}
                        className="reerui-underline-input"
                        placeholder="Please enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (visibleIdleMsg) setVisibleIdleMsg('');
                        }}
                      />
                      <button
                        id="reerui-toggle-pw"
                        type="button"
                        className="reerui-toggle-pw"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="reerui-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="reerui-submit-btn"
                    style={{
                      backgroundColor: companySettings.primary_color || '#3b82f6'
                    }}
                  >
                    {isLoading ? (
                      <span className="reerui-btn-content">
                        <div className="reerui-btn-spinner" />
                        <span>Logging in...</span>
                      </span>
                    ) : (
                      'LOGIN'
                    )}
                  </button>

                  {/* Version Tag Below Login Button */}
                  <div className="reerui-version-wrapper">
                    <span className="reerui-version-badge" title={`Software Version ${DISPLAY_VERSION}`}>
                      {DISPLAY_VERSION}
                    </span>
                  </div>

                  {/* Copyright & Support Info */}
                  <div className="reerui-login-footer">
                    <span>Copyright @ 2026</span>
                    <span className="reerui-footer-sep">|</span>
                    <a 
                      href="https://www.SoftAir.co.in" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="reerui-footer-link"
                    >
                      www.softair.co.in
                    </a>
                    <span className="reerui-footer-sep">|</span>
                    <a 
                      href="tel:+917736640292"
                      className="reerui-footer-link"
                    >
                      +91 - 7736640292
                    </a>
                    <span className="reerui-footer-sep">|</span>
                    <span className="reerui-footer-support">
                      For Support Mail to:{' '}
                      <a 
                        href="mailto:info@softair.co.in"
                        className="reerui-footer-link"
                      >
                        info@softair.co.in
                      </a>
                    </span>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default LoginPage;
