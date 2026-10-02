import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/MainLayout';
import { TopLoadingBar, PageLoader } from './components/PageLoader';
import { getFirstAccessibleMenu } from './utils/permissions';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          background: '#f8fafc',
          color: '#1e293b',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '540px',
            width: '100%',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              fontSize: '24px'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Something went wrong</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              An unexpected error occurred while rendering this page:
            </p>
            <div style={{
              background: '#f1f5f9',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#dc2626',
              textAlign: 'left',
              wordBreak: 'break-all',
              marginBottom: '20px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              {this.state.error?.message || 'Unknown Error'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes inactivity timeout

export function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('salesforce_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('salesforce_token') || null;
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [idleMessage, setIdleMessage] = useState('');

  useEffect(() => {
    const handlePermissionsUpdated = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };
    window.addEventListener('userPermissionsUpdated', handlePermissionsUpdated);
    return () => window.removeEventListener('userPermissionsUpdated', handlePermissionsUpdated);
  }, []);

  const handleLogout = (isAutoLogout = false) => {
    setCurrentUser(null);
    setToken(null);
    try {
      localStorage.removeItem('salesforce_user');
      localStorage.removeItem('salesforce_token');
      localStorage.removeItem('salesforce_last_activity');
      localStorage.removeItem('sf_nexus_active_view');
      if (window.location.hash) {
        try {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch (e) {
          window.location.hash = '';
        }
      }
    } catch (e) {}

    if (isAutoLogout) {
      setIdleMessage('You were automatically logged out due to 10 minutes of inactivity.');
    } else {
      setIdleMessage('');
    }
  };

  const handleLoginSuccess = (user, authToken) => {
    setIsTransitioning(true);
    setIdleMessage('');

    // Ensure we always navigate to the first menu upon login
    const firstMenu = getFirstAccessibleMenu(user);
    try {
      localStorage.setItem('sf_nexus_active_view', firstMenu);
      window.location.hash = firstMenu;
      localStorage.setItem('salesforce_last_activity', Date.now().toString());
    } catch (e) {}

    setCurrentUser(user);
    setToken(authToken);
    localStorage.setItem('salesforce_user', JSON.stringify(user));
    localStorage.setItem('salesforce_token', authToken);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  // 10-Minute Idle Detection & Auto-Logout System
  useEffect(() => {
    if (!currentUser) return;

    // 1. Initial check: was user already idle before this session / reload?
    const lastActiveStr = localStorage.getItem('salesforce_last_activity');
    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (!isNaN(lastActive) && Date.now() - lastActive >= IDLE_TIMEOUT_MS) {
        handleLogout(true);
        return;
      }
    }
    localStorage.setItem('salesforce_last_activity', Date.now().toString());

    // 2. Track user interaction events (throttled to avoid high frequency writes)
    let lastThrottleTime = 0;
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastThrottleTime > 2000) {
        lastThrottleTime = now;
        try {
          localStorage.setItem('salesforce_last_activity', now.toString());
        } catch (e) {}
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click'
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    // 3. Periodic idle checker every 10 seconds
    const intervalId = setInterval(() => {
      const activeStr = localStorage.getItem('salesforce_last_activity');
      const activeTime = activeStr ? parseInt(activeStr, 10) : Date.now();
      if (Date.now() - activeTime >= IDLE_TIMEOUT_MS) {
        handleLogout(true);
      }
    }, 10000);

    // 4. Check on tab visibility or window focus (e.g. laptop wake or returning from another tab)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const activeStr = localStorage.getItem('salesforce_last_activity');
        const activeTime = activeStr ? parseInt(activeStr, 10) : Date.now();
        if (Date.now() - activeTime >= IDLE_TIMEOUT_MS) {
          handleLogout(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 5. Cross-tab logout synchronization via storage event
    const handleStorage = (e) => {
      if (e.key === 'salesforce_user' && !e.newValue) {
        handleLogout(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  return (
    <ErrorBoundary>
      <div className="app-container">
        {isTransitioning ? (
          <div style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc'
          }}>
            <TopLoadingBar visible={true} />
            <PageLoader 
              message="Opening Workspace..." 
              subtext="Preparing your dashboard" 
              fullPage={true} 
            />
          </div>
        ) : currentUser ? (
          <MainLayout
            user={currentUser}
            token={token}
            onLogout={() => handleLogout(false)}
          />
        ) : (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            idleMessage={idleMessage}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;

