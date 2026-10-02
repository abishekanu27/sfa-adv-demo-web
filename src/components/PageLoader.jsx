import React from 'react';
import './PageLoader.css';

/**
 * Top Progress Bar component for visual feedback during route/tab changes.
 */
export const TopLoadingBar = ({ visible = true }) => {
  if (!visible) return null;
  return (
    <div className="top-loading-bar-container" role="progressbar" aria-label="Loading page content">
      <div className="top-loading-bar" />
    </div>
  );
};

/**
 * Full page or container loader with customizable title and subtitle.
 */
export const PageLoader = ({
  message = 'Loading data...',
  subtext = 'Please wait a moment',
  fullPage = false,
}) => {
  return (
    <div className={`page-loader-wrapper ${fullPage ? 'full-page' : ''}`}>
      <img 
        src="/SoftAir_SFA.png" 
        alt="SoftAir SFA" 
        style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain', marginBottom: '20px' }} 
      />
      <div className="loader-spinner-ring">
        <div className="ring-track" />
        <div className="ring-head" />
      </div>
      <div className="page-loader-text">{message}</div>
      {subtext && <div className="page-loader-subtext">{subtext}</div>}
    </div>
  );
};

/**
 * Lightweight inline spinner for buttons, cards, or tables.
 */
export const InlineSpinner = ({ size = 18, color = '#2563eb' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        animation: 'spinRing 0.8s linear infinite',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default PageLoader;
