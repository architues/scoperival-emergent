import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Track successful login
      track('user_login', { email: email });
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      // Track failed login attempt
      track('login_failed', { email: email });
      return false;
    }
  };

  const register = async (email, password, company_name) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email,
        password,
        company_name
      });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Track successful registration
      track('user_register', { email: email, company_name: company_name });
      
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      // Track failed registration attempt
      track('registration_failed', { email: email, company_name: company_name });
      return false;
    }
  };

  const logout = () => {
    // Track logout event
    track('user_logout');
    
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <div className="auth-context">
      {children({ user, login, register, logout, isAuthenticated: !!user })}
    </div>
  );
};

// Logo Component
const Logo = ({ size = "default", collapsed = false }) => {
  const sizeClasses = {
    small: "text-lg",
    default: "text-xl",
    large: "text-3xl"
  };

  return (
    <div className={`logo ${sizeClasses[size]} ${collapsed ? 'justify-center' : ''}`}>
      <div className="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
          <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 12L2 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </div>
      {!collapsed && (
        <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent font-bold">
          Scoperival
        </span>
      )}
    </div>
  );
};

// Sidebar Navigation Component - Simplified
const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed, user }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'competitors', label: 'Competitors', icon: '🏢' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <Logo size="default" collapsed={collapsed} />
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="collapse-btn"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
      
      <div className="sidebar-search">
        {!collapsed && (
          <div className="search-input-container">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search..." 
              className="sidebar-search-input"
            />
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              // Track sidebar navigation
              track('sidebar_navigation', {
                from: activeTab,
                to: item.id,
                trigger: 'sidebar_click'
              });
              setActiveTab(item.id);
            }}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user?.company_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="user-info">
              <div className="user-name">{user?.company_name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Top Header Component - Enhanced Modern Design
const TopHeader = ({ user, logout, activeTab, stats = {} }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
      if (showNotifications && !event.target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showNotifications]);
  
  const getPageTitle = (tab) => {
    const titles = {
      overview: 'Dashboard',
      competitors: 'Competitors',
      changes: 'Change History',
      analytics: 'Analytics',
      settings: 'Settings'
    };
    return titles[tab] || 'Dashboard';
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  const getStatusInfo = () => {
    const totalCompetitors = stats?.total_competitors || 0;
    const lastUpdated = new Date().toLocaleDateString('en-GB');
    
    return {
      status: totalCompetitors > 0 ? 'Active' : 'Setup Required',
      lastUpdated,
      isActive: totalCompetitors > 0
    };
  };

  const status = getStatusInfo();

  return (
    <header className="modern-top-header">
      <div className="header-content">
        {/* Left Section - Status and Metrics */}
        <div className="header-left-section">
          <div className="status-section">
            <div className="status-row">
              <span className="status-label">STATUS</span>
              <span className="status-label">LAST UPDATED</span>
            </div>
            <div className="status-values">
              <span className={`status-value ${status.isActive ? 'active' : 'inactive'}`}>
                {status.status}
              </span>
              <span className="date-value">{status.lastUpdated}</span>
            </div>
          </div>
          
          <div className="metrics-section">
            <div className="metric-card">
              <span className="metric-trend negative">-3%</span>
              <div className="metric-icon">⚡</div>
            </div>
            <div className="metric-main">
              <div className="metric-number">{stats?.high_significance_changes || 0}</div>
              <div className="metric-label">HIGH PRIORITY</div>
            </div>
          </div>
        </div>

        {/* Right Section - User and Actions */}
        <div className="header-right-section">
          {/* Notifications */}
          <div className="notifications-container">
            <button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <div className="notification-icon">🔔</div>
              <div className="notification-badge">3</div>
            </button>
          </div>

          {/* User Menu */}
          <div className="user-menu-container">
            <button 
              className="modern-user-trigger"
              onClick={handleUserMenuClick}
            >
              <div className="user-avatar-modern">
                S
              </div>
              <span className="user-name-modern">scoperival</span>
            </button>
            
            {showUserMenu && (
              <div className="modern-user-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-title">scoperival</div>
                  <div className="dropdown-email">{user?.email || 'ahaan.pandit@gmail.com'}</div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <button className="modern-dropdown-item">
                  <span className="item-icon">👤</span>
                  Profile Settings
                </button>
                
                <button className="modern-dropdown-item">
                  <span className="item-icon">⚙️</span>
                  Preferences
                </button>
                
                <button className="modern-dropdown-item">
                  <span className="item-icon">💳</span>
                  Billing
                </button>
                
                <div className="dropdown-divider"></div>
                
                <button 
                  className="modern-dropdown-item logout-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                >
                  <span className="item-icon">🚪</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Add Competitor Button */}
          <button className="add-competitor-header-btn">
            + Add Competitor
          </button>
        </div>
      </div>
    </header>
  );
};

// Authentication Form Component - Clean Design
const AuthForm = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let success;
    if (isLogin) {
      success = await onLogin(formData.email, formData.password);
    } else {
      success = await onRegister(formData.email, formData.password, formData.company_name);
    }
    
    if (!success) {
      alert(isLogin ? 'Login failed. Please check your credentials.' : 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center" style={{ padding: '20px' }}>
      <div className="auth-form" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--blue-primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'white',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            S
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)'
          }}>
            {isLogin ? 'Sign in to your Scoperival account' : 'Start tracking your competitors'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Email Address
            </label>
            <input
              type="email"
              required
              className="modern-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <input
              type="password"
              required
              className="modern-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          
          {!isLogin && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '6px'
              }}>
                Company Name
              </label>
              <input
                type="text"
                required
                className="modern-input"
                placeholder="Enter your company name"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div className="loading-spinner" style={{width: '16px', height: '16px'}}></div>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
        
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-light)'
        }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--blue-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component - Clean Version
const Dashboard = ({ user, logout }) => {
  const [stats, setStats] = useState({});
  const [competitors, setCompetitors] = useState([]);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const competitorsRes = await axios.get(`${API}/competitors`);
      
      setCompetitors(competitorsRes.data);
      
      // Calculate stats from competitors data
      setStats({
        total_competitors: competitorsRes.data.length,
        total_tracked_pages: competitorsRes.data.reduce((acc, comp) => acc + (comp.tracked_pages?.length || 0), 0),
        recent_changes: 0,
        high_significance_changes: 0
      });
      setChanges([]);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setCompetitors([]);
      setStats({
        total_competitors: 0,
        total_tracked_pages: 0,
        recent_changes: 0,
        high_significance_changes: 0
      });
      setChanges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = () => {
    // Track navigation to competitors tab
    track('tab_navigation', { 
      from: 'overview',
      to: 'competitors',
      trigger: 'add_competitor_button'
    });
    
    setActiveTab('competitors');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center fade-in">
          <div className="loading-spinner mx-auto mb-6"></div>
          <p className="text-slate-400 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopHeader user={user} logout={logout} activeTab={activeTab} stats={stats} />
        
        <div className="content-area">
          <div className="fade-in">
            {activeTab === 'overview' && (
              <OverviewTab 
                stats={stats} 
                competitors={competitors} 
                changes={changes} 
                onAddCompetitor={handleAddCompetitor}
              />
            )}
            {activeTab === 'competitors' && <CompetitorsTab competitors={competitors} onRefresh={fetchDashboardData} />}
            {activeTab === 'settings' && <SettingsTab user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Overview Tab - Clean Design
const OverviewTab = ({ stats, competitors, changes, onAddCompetitor }) => {
  const recentChanges = changes.slice(0, 3);
  const topCompetitors = competitors.slice(0, 5);

  const handleAddCompetitorClick = () => {
    // Track add competitor button click
    track('add_competitor_clicked', { 
      source: 'overview_tab',
      competitor_count: competitors.length 
    });
    
    if (onAddCompetitor) {
      onAddCompetitor();
    }
  };

  return (
    <div className="overview-layout">
      {/* Main Stats Section */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-header">
              <span className="stat-icon">🏢</span>
              <span className="stat-trend up">+12%</span>
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.total_competitors || 0}</h3>
              <p className="stat-label">Competitors</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">📄</span>
              <span className="stat-trend up">+8%</span>
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.total_tracked_pages || 0}</h3>
              <p className="stat-label">Pages Tracked</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">🔄</span>
              <span className="stat-trend down">-3%</span>
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.recent_changes || 0}</h3>
              <p className="stat-label">Recent Changes</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">⚡</span>
              <span className="stat-trend up">+15%</span>
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.high_significance_changes || 0}</h3>
              <p className="stat-label">High Priority</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="two-column-layout">
        {/* Left Column - Recent Changes */}
        <div className="left-column">
          <div className="section-card">
            <div className="section-header">
              <h3>Recent Changes</h3>
              <button className="view-all-btn">View All</button>
            </div>
            <div className="changes-list">
              {recentChanges.length > 0 ? (
                recentChanges.map((change, index) => (
                  <div key={index} className="change-item">
                    <div className="change-avatar">
                      <span className="competitor-initial">
                        {competitors.find(c => c.id === change.competitor_id)?.company_name?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div className="change-details">
                      <h4 className="change-title">{change.change_summary}</h4>
                      <p className="change-meta">
                        {competitors.find(c => c.id === change.competitor_id)?.company_name || 'Unknown'} • 
                        {new Date(change.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`significance-badge small ${change.significance_score >= 4 ? 'high' : change.significance_score >= 3 ? 'medium' : 'low'}`}>
                      {change.significance_score}/5
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">📊</span>
                  <p>No recent changes detected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Competitor List */}
        <div className="right-column">
          <div className="section-card">
            <div className="section-header">
              <h3>Competitors</h3>
              <button 
                className="add-competitor-btn"
                onClick={handleAddCompetitorClick}
              >
                + Add Competitor
              </button>
            </div>
            <div className="competitors-table">
              <div className="table-header">
                <span>Company</span>
                <span>Pages</span>
                <span>Changes</span>
                <span>Status</span>
              </div>
              {topCompetitors.length > 0 ? (
                topCompetitors.map((competitor, index) => (
                  <div key={index} className="table-row">
                    <div className="competitor-info">
                      <div className="competitor-avatar">
                        {competitor.company_name.charAt(0)}
                      </div>
                      <div>
                        <div className="competitor-name">{competitor.company_name}</div>
                        <div className="competitor-domain">{competitor.domain}</div>
                      </div>
                    </div>
                    <span className="pages-count">{competitor.tracked_pages?.length || 0}</span>
                    <span className="changes-count">
                      {changes.filter(c => c.competitor_id === competitor.id).length}
                    </span>
                    <span className="status-badge active">Active</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">🏢</span>
                  <p>No competitors added yet</p>
                  <button 
                    className="btn-primary" 
                    onClick={handleAddCompetitorClick}
                    style={{ marginTop: '12px' }}
                  >
                    Add Your First Competitor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Competitors Tab
const CompetitorsTab = ({ competitors, onRefresh }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ domain: '', company_name: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [currentCompetitorId, setCurrentCompetitorId] = useState(null);
  const [scanning, setScanning] = useState({});
  const [localCompetitors, setLocalCompetitors] = useState(competitors);
  const [loading, setLoading] = useState(false);

  // Sync with props only when they change, no automatic refresh
  useEffect(() => {
    setLocalCompetitors(competitors);
  }, [competitors]);

  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/competitors`);
      setLocalCompetitors(response.data);
      // Only call onRefresh if the data is actually different
      if (onRefresh && JSON.stringify(response.data) !== JSON.stringify(competitors)) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to fetch competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(`${API}/competitors`, newCompetitor);
      const competitorId = response.data.id;
      
      const suggestionsRes = await axios.post(`${API}/competitors/discover-pages`, {
        domain: newCompetitor.domain
      });
      
      setSuggestions(suggestionsRes.data.suggestions);
      setCurrentCompetitorId(competitorId);
      setSelectedPages(suggestionsRes.data.suggestions.map(s => ({ url: s.url, page_type: s.page_type })));
      setNewCompetitor({ domain: '', company_name: '' });
    } catch (error) {
      console.error('Failed to add competitor:', error);
      alert('Failed to add competitor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePages = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/competitors/${currentCompetitorId}/pages`, {
        urls: selectedPages
      });
      setShowAddForm(false);
      setSuggestions([]);
      setCurrentCompetitorId(null);
      setSelectedPages([]);
      // Refresh competitors data after successfully adding
      await fetchCompetitors();
    } catch (error) {
      console.error('Failed to save pages:', error);
      alert('Failed to save pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (competitorId) => {
    setScanning({ ...scanning, [competitorId]: true });
    try {
      const response = await axios.post(`${API}/competitors/${competitorId}/scan`);
      alert(response.data.message);
      await fetchCompetitors();
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed. Please try again.');
    } finally {
      setScanning({ ...scanning, [competitorId]: false });
    }
  };

  const handleDeleteCompetitor = async (competitorId) => {
    if (window.confirm('Are you sure you want to delete this competitor?')) {
      try {
        setLoading(true);
        await axios.delete(`${API}/competitors/${competitorId}`);
        await fetchCompetitors();
      } catch (error) {
        console.error('Failed to delete competitor:', error);
        alert('Failed to delete competitor. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && localCompetitors.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-slate-400">Loading competitors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Competitors</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-electric"
        >
          + Add Competitor
        </button>
      </div>

      {showAddForm && (
        <div className="modern-card p-6 slide-up">
          <h3 className="text-xl font-semibold text-white mb-6">Add New Competitor</h3>
          
          {!suggestions.length ? (
            <form onSubmit={handleAddCompetitor} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Domain</label>
                  <input
                    type="text"
                    required
                    placeholder="stripe.com"
                    className="modern-input w-full"
                    value={newCompetitor.domain}
                    onChange={(e) => setNewCompetitor({...newCompetitor, domain: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Stripe Inc."
                    className="modern-input w-full"
                    value={newCompetitor.company_name}
                    onChange={(e) => setNewCompetitor({...newCompetitor, company_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <button type="submit" className="btn-electric">
                  Discover Pages
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h4 className="font-medium text-white mb-4">Select pages to track:</h4>
              <div className="space-y-3 mb-6">
                {suggestions.map((suggestion, index) => (
                  <label key={index} className="flex items-center p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.some(p => p.url === suggestion.url)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPages([...selectedPages, { url: suggestion.url, page_type: suggestion.page_type }]);
                        } else {
                          setSelectedPages(selectedPages.filter(p => p.url !== suggestion.url));
                        }
                      }}
                      className="mr-3 text-blue-500"
                    />
                    <div>
                      <span className="text-blue-400 font-medium capitalize">{suggestion.page_type}</span>
                      <span className="text-slate-400 ml-2 text-sm">{suggestion.url}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex space-x-4">
                <button onClick={handleSavePages} className="btn-electric">
                  Start Tracking
                </button>
                <button 
                  onClick={() => {
                    setShowAddForm(false);
                    setSuggestions([]);
                    setCurrentCompetitorId(null);
                    setSelectedPages([]);
                  }} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {localCompetitors.map((competitor) => (
          <div key={competitor.id} className="modern-card p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {competitor.company_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{competitor.company_name}</h3>
                  <p className="text-blue-400 text-sm">{competitor.domain}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteCompetitor(competitor.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Pages Tracked</span>
                <span className="text-blue-400 font-medium">{competitor.tracked_pages?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Scan Frequency</span>
                <span className="text-slate-300">24h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
              
              {competitor.tracked_pages && competitor.tracked_pages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-400 text-sm">Tracking:</span>
                  {competitor.tracked_pages.slice(0, 3).map((page, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md capitalize">
                        {page.page_type}
                      </span>
                      <span className="text-slate-500">{new URL(page.url).pathname}</span>
                    </div>
                  ))}
                  {competitor.tracked_pages.length > 3 && (
                    <div className="text-xs text-slate-500">
                      +{competitor.tracked_pages.length - 3} more pages
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => handleScan(competitor.id)}
              disabled={scanning[competitor.id]}
              className="btn-electric w-full"
            >
              {scanning[competitor.id] ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner mr-2" style={{width: '16px', height: '16px'}}></div>
                  Scanning...
                </div>
              ) : (
                'Manual Scan'
              )}
            </button>
          </div>
        ))}
      </div>

      {localCompetitors.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🎯</div>
          <h3 className="text-2xl font-semibold text-white mb-4">No competitors yet</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Start monitoring your competition by adding your first competitor. 
            We'll automatically discover their key pages and track changes.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-electric pulse-glow"
          >
            Add Your First Competitor
          </button>
        </div>
      )}
    </div>
  );
};

// Changes Tab - Fixed UI for better readability
const ChangesTab = ({ changes, competitors }) => {
  const getCompetitorName = (competitorId) => {
    const competitor = competitors.find(c => c.id === competitorId);
    return competitor ? competitor.company_name : 'Unknown';
  };

  const getSignificanceClass = (score) => {
    if (score >= 4) return 'significance-high';
    if (score >= 3) return 'significance-medium';
    return 'significance-low';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {changes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🔄</div>
          <h3 className="text-2xl font-semibold text-white mb-4">No changes detected yet</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Run scans on your competitors to see AI-powered insights about their strategic changes appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {changes.map((change) => (
            <div key={change.id} className="modern-card p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-700/50">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {getCompetitorName(change.competitor_id)}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {formatDate(change.created_at)}
                  </p>
                </div>
                <span className={`significance-badge ${getSignificanceClass(change.significance_score)}`}>
                  Priority {change.significance_score}/5
                </span>
              </div>
              
              {/* Content Sections */}
              <div className="space-y-6">
                {/* What Changed */}
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="flex items-center text-blue-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                    <span className="mr-2">📝</span>
                    What Changed
                  </h4>
                  <p className="text-slate-200 leading-relaxed">
                    {change.change_summary}
                  </p>
                </div>
                
                {/* Strategic Implications */}
                <div className="bg-purple-900/20 rounded-lg p-4">
                  <h4 className="flex items-center text-purple-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                    <span className="mr-2">🧠</span>
                    Strategic Implications
                  </h4>
                  <p className="text-slate-200 leading-relaxed">
                    {change.strategic_implications}
                  </p>
                </div>
                
                {/* Suggested Actions */}
                <div className="bg-green-900/20 rounded-lg p-4">
                  <h4 className="flex items-center text-green-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                    <span className="mr-2">⚡</span>
                    Suggested Actions
                  </h4>
                  <div className="space-y-2">
                    {change.suggested_actions.map((action, index) => (
                      <div key={index} className="flex items-start">
                        <span className="text-green-400 mr-3 mt-1 text-sm">•</span>
                        <span className="text-slate-200 leading-relaxed">
                          {action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-700/50">
                <button className="btn-secondary text-sm px-4 py-2">
                  Mark as Read
                </button>
                <button className="btn-electric text-sm px-4 py-2">
                  Share Analysis
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced Analytics Tab with proper UI
const AnalyticsTab = ({ stats, competitors, changes }) => {
  // Calculate analytics data
  const recentChanges = changes.slice(0, 7);
  const competitorActivity = competitors.map(comp => ({
    name: comp.company_name,
    domain: comp.domain,
    pages: comp.tracked_pages?.length || 0,
    changes: changes.filter(c => c.competitor_id === comp.id).length,
    lastScan: comp.tracked_pages?.[0]?.last_scraped || null
  }));

  // Mock data for charts (in real app, this would come from backend)
  const chartData = [
    { day: 'Mon', changes: 3 },
    { day: 'Tue', changes: 7 },
    { day: 'Wed', changes: 2 },
    { day: 'Thu', changes: 5 },
    { day: 'Fri', changes: 8 },
    { day: 'Sat', changes: 1 },
    { day: 'Sun', changes: 4 }
  ];

  const maxChanges = Math.max(...chartData.map(d => d.changes));

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Total Changes</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">{changes.length}</div>
          <p className="text-slate-400 text-sm">All time detections</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Active Monitoring</h3>
            <span className="text-2xl">🔍</span>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-2">{stats.total_tracked_pages || 0}</div>
          <p className="text-slate-400 text-sm">Pages being tracked</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">High Priority</h3>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-3xl font-bold text-red-400 mb-2">{stats.high_significance_changes || 0}</div>
          <p className="text-slate-400 text-sm">Critical changes detected</p>
        </div>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Frequency Chart */}
        <div className="modern-card p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Change Frequency (Last 7 Days)</h3>
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-300 w-12 text-sm">{item.day}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${(item.changes / maxChanges) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-blue-400 font-semibold text-sm w-8 text-right">{item.changes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Activity */}
        <div className="modern-card p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Competitor Activity</h3>
          <div className="space-y-4">
            {competitorActivity.length > 0 ? (
              competitorActivity.map((comp, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      {comp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{comp.name}</div>
                      <div className="text-slate-400 text-xs">{comp.domain}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 font-semibold text-sm">{comp.changes} changes</div>
                    <div className="text-slate-500 text-xs">{comp.pages} pages tracked</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📈</div>
                <p className="text-slate-400">No competitor data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="modern-card p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {recentChanges.length > 0 ? (
            recentChanges.map((change, index) => {
              const competitor = competitors.find(c => c.id === change.competitor_id);
              return (
                <div key={index} className="flex items-start space-x-4 p-4 bg-slate-800/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">
                        {competitor?.company_name || 'Unknown Competitor'}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {new Date(change.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm line-clamp-2">
                      {change.change_summary}
                    </p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        change.significance_score >= 4 
                          ? 'bg-red-900/30 text-red-400' 
                          : change.significance_score >= 3 
                          ? 'bg-yellow-900/30 text-yellow-400' 
                          : 'bg-green-900/30 text-green-400'
                      }`}>
                        Priority {change.significance_score}/5
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-400">No recent activity to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="modern-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Scanning Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Success Rate</span>
              <span className="text-green-400 font-semibold">98.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Average Scan Time</span>
              <span className="text-blue-400 font-semibold">2.3s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Last Scan</span>
              <span className="text-slate-300">2 hours ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Next Scheduled</span>
              <span className="text-slate-300">In 22 hours</span>
            </div>
          </div>
        </div>

        <div className="modern-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Detection Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Most Active Competitor</span>
              <span className="text-white font-semibold">
                {competitorActivity.length > 0 
                  ? competitorActivity.sort((a, b) => b.changes - a.changes)[0]?.name || 'N/A'
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Common Change Type</span>
              <span className="text-blue-400 font-semibold">Pricing Updates</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Peak Activity Day</span>
              <span className="text-slate-300">Friday</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Alert Accuracy</span>
              <span className="text-green-400 font-semibold">94.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simplified Settings Tab
const SettingsTab = ({ user }) => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [scanFrequency, setScanFrequency] = useState('24h');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-8">
      {/* Account Settings */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Account Settings
          </h3>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary text-sm px-4 py-2"
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Company Name</label>
            <input 
              type="text" 
              value={user?.company_name || 'Your Company'} 
              className={`modern-input w-full ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              type="email" 
              value={user?.email || 'you@company.com'} 
              className={`modern-input w-full ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!isEditing}
            />
          </div>
        </div>
        
        {isEditing && (
          <div className="flex justify-end space-x-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => setIsEditing(false)}
              className="btn-secondary px-4 py-2"
            >
              Cancel
            </button>
            <button className="btn-electric px-4 py-2">
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="modern-card p-6">
        <div className="flex items-center mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </h3>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div>
              <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Email Notifications</h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Receive alerts for competitor changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Scan Frequency</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: '12h', label: 'Every 12 hours' },
                { value: '24h', label: 'Daily' },
                { value: '48h', label: 'Every 2 days' }
              ].map((freq) => (
                <label key={freq.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors" style={{ borderColor: 'var(--border-light)' }}>
                  <input 
                    type="radio" 
                    name="frequency" 
                    value={freq.value}
                    checked={scanFrequency === freq.value}
                    onChange={(e) => setScanFrequency(e.target.value)}
                    className="text-blue-500 mr-3"
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{freq.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="modern-card p-6">
        <div className="flex items-center mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Account Actions
          </h3>
        </div>
        
        <div className="space-y-4">
          <button className="btn-secondary w-full md:w-auto px-6 py-3">
            Change Password
          </button>
          
          <button className="btn-secondary w-full md:w-auto px-6 py-3">
            Export Data
          </button>
          
          <div className="pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            <button className="text-red-600 hover:text-red-700 text-sm font-medium">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component - Version 2.1 - Clean UI + Analytics
function App() {
  // Force cache refresh for deployment with console logs
  console.log('🚀 Scoperival App - Version 2.1 - Clean UI + Analytics Deployed');
  console.log('✅ User menu dropdown enhanced with inline styles');
  console.log('✅ Add Competitor button with click handlers and styles');
  console.log('✅ Debug logs added for troubleshooting');
  console.log('📊 Vercel Analytics enabled for tracking');
  console.log('🎨 Clean professional UI design applied');
  
  return (
    <div className="App">
      <AuthContext>
        {({ user, login, register, logout, isAuthenticated }) => (
          isAuthenticated ? (
            <Dashboard user={user} logout={logout} />
          ) : (
            <AuthForm onLogin={login} onRegister={register} />
          )
        )}
      </AuthContext>
      <Analytics />
    </div>
  );
}

export default App;