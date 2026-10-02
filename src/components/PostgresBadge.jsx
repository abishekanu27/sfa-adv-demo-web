import React from 'react';
import { Database, CheckCircle2, AlertCircle } from 'lucide-react';

export const PostgresBadge = ({ isDbConnected, dbInfo }) => {
  return (
    <div
      id="db-connection-status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '9999px',
        background: isDbConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
        border: `1px solid ${isDbConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
        fontSize: '12px',
        fontWeight: '500',
        color: isDbConnected ? '#10b981' : '#f59e0b',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease',
      }}
      title={isDbConnected ? `PostgreSQL Connected: ${dbInfo.database || 'salesforce_db'}` : 'Operating with In-Memory Demo Fallback'}
    >
      <Database size={14} />
      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: isDbConnected ? '#10b981' : '#f59e0b',
            boxShadow: isDbConnected ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }}
        />
        {isDbConnected ? 'PostgreSQL 18 Active' : 'Demo Auth Mode'}
      </span>
    </div>
  );
};
