import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

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
      return true;
    } catch (error) {
      console.error('Login failed:', error);
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
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = () => {
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

// Sidebar Navigation Component
const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed, user }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'competitors', label: 'Competitors', icon: '🏢' },
    { id: 'changes', label: 'Changes', icon: '🔄' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
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
              placeholder="Search competitors..." 
              className="sidebar-search-input"
            />
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
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

// Top Header Component
const TopHeader = ({ user, logout, activeTab }) => {
  const getPageTitle = (tab) => {
    const titles = {
      overview: 'Dashboard Overview',
      competitors: 'Competitor Management',
      changes: 'Change Analysis',
      analytics: 'Analytics',
      settings: 'Settings'
    };
    return titles[tab] || 'Dashboard';
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="page-title">{getPageTitle(activeTab)}</h1>
        <p className="page-subtitle">AI-powered competitive intelligence platform</p>
      </div>
      
      <div className="header-right">
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Status</span>
            <span className="stat-value active">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Last Updated</span>
            <span className="stat-value">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="notification-btn">
            🔔
            <span className="notification-badge">3</span>
          </button>
          
          <div className="user-menu">
            <div className="user-avatar-header">
              {user?.company_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-dropdown">
              <button onClick={logout} className="logout-btn">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Login/Register Component
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
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="auth-form w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <Logo size="large" />
          <p className="text-slate-300 mt-4 text-lg">AI-Powered Competitor Intelligence</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="modern-input w-full"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
            <input
              type="password"
              required
              className="modern-input w-full"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Company Name</label>
              <input
                type="text"
                required
                className="modern-input w-full"
                placeholder="Enter your company name"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn-electric w-full"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="loading-spinner mr-2" style={{width: '16px', height: '16px'}}></div>
                Processing...
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
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
      const [statsRes, competitorsRes, changesRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/competitors`),
        axios.get(`${API}/changes`)
      ]);
      
      setStats(statsRes.data);
      setCompetitors(competitorsRes.data);
      setChanges(changesRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-electric flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="loading-spinner mx-auto mb-6"></div>
          <p className="text-slate-300 text-lg">Loading your competitive intelligence...</p>
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
        <TopHeader user={user} logout={logout} activeTab={activeTab} />
        
        <div className="content-area">
          <div className="fade-in">
            {activeTab === 'overview' && <OverviewTab stats={stats} competitors={competitors} changes={changes} />}
            {activeTab === 'competitors' && <CompetitorsTab competitors={competitors} onRefresh={fetchDashboardData} />}
            {activeTab === 'changes' && <ChangesTab changes={changes} competitors={competitors} />}
            {activeTab === 'analytics' && <AnalyticsTab stats={stats} competitors={competitors} changes={changes} />}
            {activeTab === 'settings' && <SettingsTab user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Overview Tab with new layout
const OverviewTab = ({ stats, competitors, changes }) => {
  const recentChanges = changes.slice(0, 3);
  const topCompetitors = competitors.slice(0, 5);

  return (
    <div className="overview-layout">
      {/* Main Stats Section */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-header">
              <span className="stat-icon">📊</span>
              <span className="stat-trend up">+12%</span>
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.total_competitors || 0}</h3>
              <p className="stat-label">Total Competitors</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">🔍</span>
              <span className="stat-trend up">+8%</span>
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.total_tracked_pages || 0}</h3>
              <p className="stat-label">Tracked Pages</p>
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
              <h3>Top Competitors</h3>
              <button className="add-competitor-btn">+ Add Competitor</button>
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

  const handleAddCompetitor = async (e) => {
    e.preventDefault();
    try {
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
    }
  };

  const handleSavePages = async () => {
    try {
      await axios.post(`${API}/competitors/${currentCompetitorId}/pages`, {
        urls: selectedPages
      });
      setShowAddForm(false);
      setSuggestions([]);
      setCurrentCompetitorId(null);
      setSelectedPages([]);
      onRefresh();
    } catch (error) {
      console.error('Failed to save pages:', error);
      alert('Failed to save pages. Please try again.');
    }
  };

  const handleScan = async (competitorId) => {
    setScanning({ ...scanning, [competitorId]: true });
    try {
      const response = await axios.post(`${API}/competitors/${competitorId}/scan`);
      alert(response.data.message);
      onRefresh();
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
        await axios.delete(`${API}/competitors/${competitorId}`);
        onRefresh();
      } catch (error) {
        console.error('Failed to delete competitor:', error);
        alert('Failed to delete competitor. Please try again.');
      }
    }
  };

  return (
    <div className="competitors-page">
      <div className="page-actions">
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-electric"
        >
          + Add Competitor
        </button>
      </div>

      {showAddForm && (
        <div className="add-competitor-form">
          <div className="form-card">
            <h3>Add New Competitor</h3>
            
            {!suggestions.length ? (
              <form onSubmit={handleAddCompetitor} className="competitor-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Domain</label>
                    <input
                      type="text"
                      required
                      placeholder="stripe.com"
                      className="modern-input"
                      value={newCompetitor.domain}
                      onChange={(e) => setNewCompetitor({...newCompetitor, domain: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Stripe Inc."
                      className="modern-input"
                      value={newCompetitor.company_name}
                      onChange={(e) => setNewCompetitor({...newCompetitor, company_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-electric">Discover Pages</button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="page-selection">
                <h4>Select pages to track:</h4>
                <div className="pages-grid">
                  {suggestions.map((suggestion, index) => (
                    <label key={index} className="page-option">
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
                      />
                      <div className="page-info">
                        <span className="page-type">{suggestion.page_type}</span>
                        <span className="page-url">{suggestion.url}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="form-actions">
                  <button onClick={handleSavePages} className="btn-electric">Start Tracking</button>
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
        </div>
      )}

      <div className="competitors-grid">
        {competitors.map((competitor) => (
          <div key={competitor.id} className="competitor-card-detailed">
            <div className="card-header">
              <div className="competitor-info">
                <div className="competitor-avatar large">
                  {competitor.company_name.charAt(0)}
                </div>
                <div>
                  <h3>{competitor.company_name}</h3>
                  <p>{competitor.domain}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteCompetitor(competitor.id)}
                className="delete-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="card-content">
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-number">{competitor.tracked_pages?.length || 0}</span>
                  <span className="stat-label">Pages</span>
                </div>
                <div className="stat">
                  <span className="stat-number">24h</span>
                  <span className="stat-label">Frequency</span>
                </div>
                <div className="stat">
                  <span className="stat-number active">Active</span>
                  <span className="stat-label">Status</span>
                </div>
              </div>
              
              <div className="tracked-pages">
                {competitor.tracked_pages?.slice(0, 3).map((page, index) => (
                  <div key={index} className="page-item">
                    <span className="page-type-badge">{page.page_type}</span>
                    <span className="page-path">{new URL(page.url).pathname}</span>
                  </div>
                ))}
                {competitor.tracked_pages?.length > 3 && (
                  <div className="more-pages">+{competitor.tracked_pages.length - 3} more</div>
                )}
              </div>
            </div>
            
            <div className="card-actions">
              <button
                onClick={() => handleScan(competitor.id)}
                disabled={scanning[competitor.id]}
                className="btn-electric full-width"
              >
                {scanning[competitor.id] ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {competitors.length === 0 && (
        <div className="empty-state-large">
          <div className="empty-icon">🎯</div>
          <h3>No competitors yet</h3>
          <p>Start monitoring your competition by adding your first competitor</p>
          <button onClick={() => setShowAddForm(true)} className="btn-electric">
            Add Your First Competitor
          </button>
        </div>
      )}
    </div>
  );
};

// Changes Tab - keeping the existing implementation
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
    <div className="changes-page">
      {changes.length === 0 ? (
        <div className="empty-state-large">
          <div className="empty-icon">🔄</div>
          <h3>No changes detected yet</h3>
          <p>Run scans on your competitors to see AI-powered insights here</p>
        </div>
      ) : (
        <div className="changes-list">
          {changes.map((change) => (
            <div key={change.id} className="change-card">
              <div className="change-header">
                <div className="change-info">
                  <h3>{getCompetitorName(change.competitor_id)}</h3>
                  <p>{formatDate(change.created_at)}</p>
                </div>
                <span className={`significance-badge ${getSignificanceClass(change.significance_score)}`}>
                  Priority {change.significance_score}/5
                </span>
              </div>
              
              <div className="change-content">
                <div className="change-section">
                  <h4>📝 What Changed</h4>
                  <p>{change.change_summary}</p>
                </div>
                
                <div className="change-section">
                  <h4>🧠 Strategic Implications</h4>
                  <p>{change.strategic_implications}</p>
                </div>
                
                <div className="change-section">
                  <h4>⚡ Suggested Actions</h4>
                  <ul>
                    {change.suggested_actions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// New Analytics Tab
const AnalyticsTab = ({ stats, competitors, changes }) => {
  return (
    <div className="analytics-page">
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Change Frequency</h3>
          <div className="chart-placeholder">
            <div className="chart-bars">
              <div className="bar" style={{height: '60%'}}></div>
              <div className="bar" style={{height: '80%'}}></div>
              <div className="bar" style={{height: '40%'}}></div>
              <div className="bar" style={{height: '90%'}}></div>
              <div className="bar" style={{height: '70%'}}></div>
            </div>
          </div>
        </div>
        
        <div className="analytics-card">
          <h3>Competitor Activity</h3>
          <div className="activity-list">
            {competitors.slice(0, 5).map((comp, index) => (
              <div key={index} className="activity-item">
                <span>{comp.company_name}</span>
                <div className="activity-bar">
                  <div className="activity-fill" style={{width: `${Math.random() * 100}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// New Settings Tab
const SettingsTab = ({ user }) => {
  return (
    <div className="settings-page">
      <div className="settings-card">
        <h3>Account Settings</h3>
        <div className="setting-item">
          <label>Company Name</label>
          <input type="text" value={user.company_name} className="modern-input" readOnly />
        </div>
        <div className="setting-item">
          <label>Email</label>
          <input type="email" value={user.email} className="modern-input" readOnly />
        </div>
      </div>
      
      <div className="settings-card">
        <h3>Notification Settings</h3>
        <div className="setting-item">
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            Email notifications for high-priority changes
          </label>
        </div>
        <div className="setting-item">
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            Weekly summary reports
          </label>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
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
    </div>
  );
}

export default App;