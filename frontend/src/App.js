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
const Logo = ({ size = "default" }) => {
  const sizeClasses = {
    small: "text-xl",
    default: "text-2xl",
    large: "text-4xl"
  };

  return (
    <div className={`logo ${sizeClasses[size]}`}>
      <div className="logo-icon">
        <div className="relative">
          <div className="absolute inset-0 bg-white rounded-full opacity-20"></div>
        </div>
      </div>
      <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent font-bold">
        Scoperival
      </span>
    </div>
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
    <div className="min-h-screen bg-gradient-electric">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-slate-300 text-sm">{user.company_name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-slate-400 text-sm hidden md:block">{user.email}</span>
                <button
                  onClick={logout}
                  className="btn-secondary text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800/30 backdrop-blur-lg border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'competitors', label: 'Competitors', icon: '🏢' },
              { id: 'changes', label: 'Changes', icon: '🔄' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab flex items-center space-x-2 ${
                  activeTab === tab.id ? 'active' : ''
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-8 px-6 lg:px-8">
        <div className="fade-in">
          {activeTab === 'overview' && <OverviewTab stats={stats} />}
          {activeTab === 'competitors' && <CompetitorsTab competitors={competitors} onRefresh={fetchDashboardData} />}
          {activeTab === 'changes' && <ChangesTab changes={changes} competitors={competitors} />}
        </div>
      </main>
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ stats }) => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <h2 className="text-3xl font-bold text-white">Dashboard Overview</h2>
      <div className="text-sm text-slate-400">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="stat-card">
        <div className="stat-icon blue">
          🏢
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">Total Competitors</p>
        <p className="text-3xl font-bold text-white">{stats.total_competitors || 0}</p>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon green">
          📊
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">Tracked Pages</p>
        <p className="text-3xl font-bold text-white">{stats.total_tracked_pages || 0}</p>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon yellow">
          🔄
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">Recent Changes</p>
        <p className="text-3xl font-bold text-white">{stats.recent_changes || 0}</p>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon red">
          ⚡
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">High Priority</p>
        <p className="text-3xl font-bold text-white">{stats.high_significance_changes || 0}</p>
      </div>
    </div>

    <div className="modern-card p-8">
      <h3 className="text-xl font-semibold text-white mb-6">Getting Started</h3>
      <div className="space-y-4">
        {[
          { step: 1, text: "Add your first competitor in the Competitors tab", completed: stats.total_competitors > 0 },
          { step: 2, text: "Select pages to track (pricing, features, blog, etc.)", completed: stats.total_tracked_pages > 0 },
          { step: 3, text: "Run manual scans or wait for automated monitoring", completed: false },
          { step: 4, text: "Review AI-powered insights in the Changes tab", completed: stats.recent_changes > 0 }
        ].map((item, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              item.completed 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-slate-700 text-slate-400 border border-slate-600'
            }`}>
              {item.completed ? '✓' : item.step}
            </div>
            <span className={item.completed ? 'text-slate-300' : 'text-slate-400'}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Competitors Tab
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Competitors</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-electric"
        >
          Add Competitor
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
                <button
                  type="submit"
                  className="btn-electric"
                >
                  Discover Pages
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary"
                >
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
                <button
                  onClick={handleSavePages}
                  className="btn-electric"
                >
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
        {competitors.map((competitor) => (
          <div key={competitor.id} className="competitor-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{competitor.company_name}</h3>
                <p className="text-blue-400 text-sm">{competitor.domain}</p>
              </div>
              <button
                onClick={() => handleDeleteCompetitor(competitor.id)}
                className="text-red-400 hover:text-red-300 transition-colors p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-slate-300 text-sm">
                <span className="font-medium text-blue-400">{competitor.tracked_pages?.length || 0}</span> pages tracked
              </p>
              {competitor.tracked_pages?.slice(0, 3).map((page, index) => (
                <div key={index} className="text-xs text-slate-400 bg-slate-700/30 px-2 py-1 rounded">
                  <span className="text-blue-400 capitalize">{page.page_type}</span> • {new URL(page.url).pathname}
                </div>
              ))}
              {competitor.tracked_pages?.length > 3 && (
                <div className="text-xs text-slate-500">
                  +{competitor.tracked_pages.length - 3} more pages
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

      {competitors.length === 0 && (
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

// Changes Tab
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Recent Changes</h2>
        <div className="text-sm text-slate-400">
          AI-powered competitive intelligence
        </div>
      </div>
      
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
            <div key={change.id} className="modern-card p-6 slide-up">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
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
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2 flex items-center">
                    <span className="mr-2">📝</span>
                    What Changed
                  </h4>
                  <p className="text-slate-300 bg-slate-700/30 p-4 rounded-lg">
                    {change.change_summary}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2 flex items-center">
                    <span className="mr-2">🧠</span>
                    Strategic Implications
                  </h4>
                  <p className="text-slate-300 bg-slate-700/30 p-4 rounded-lg">
                    {change.strategic_implications}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2 flex items-center">
                    <span className="mr-2">⚡</span>
                    Suggested Actions
                  </h4>
                  <ul className="space-y-2">
                    {change.suggested_actions.map((action, index) => (
                      <li key={index} className="flex items-start text-slate-300">
                        <span className="text-blue-400 mr-2 mt-1">•</span>
                        <span className="bg-slate-700/30 px-3 py-2 rounded-lg flex-1">
                          {action}
                        </span>
                      </li>
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