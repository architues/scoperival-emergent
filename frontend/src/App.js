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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Scoperival</h1>
          <p className="text-gray-600">Competitor Intelligence Platform</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 text-sm"
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSignificanceColor = (score) => {
    if (score >= 4) return 'text-red-600 bg-red-100';
    if (score >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your competitor intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🎯 Scoperival</h1>
              <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {user.company_name}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user.email}</span>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'competitors', 'changes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'competitors' && <CompetitorsTab competitors={competitors} onRefresh={fetchDashboardData} />}
        {activeTab === 'changes' && <ChangesTab changes={changes} competitors={competitors} />}
      </main>
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ stats }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <span className="text-2xl">🏢</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Competitors</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_competitors || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <span className="text-2xl">📊</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Tracked Pages</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_tracked_pages || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <span className="text-2xl">🔄</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Recent Changes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.recent_changes || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-red-100 rounded-lg">
            <span className="text-2xl">⚡</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">High Priority</p>
            <p className="text-2xl font-bold text-gray-900">{stats.high_significance_changes || 0}</p>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h3>
      <div className="space-y-3">
        <div className="flex items-center text-sm">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">1</span>
          <span>Add your first competitor in the Competitors tab</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">2</span>
          <span>Select pages to track (pricing, features, blog, etc.)</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">3</span>
          <span>Run manual scans or wait for automated monitoring</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">4</span>
          <span>Review AI-powered insights in the Changes tab</span>
        </div>
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
      // Create competitor
      const response = await axios.post(`${API}/competitors`, newCompetitor);
      const competitorId = response.data.id;
      
      // Discover pages
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Competitors</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Competitor
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Competitor</h3>
          
          {!suggestions.length ? (
            <form onSubmit={handleAddCompetitor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    required
                    placeholder="example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCompetitor.domain}
                    onChange={(e) => setNewCompetitor({...newCompetitor, domain: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Company Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCompetitor.company_name}
                    onChange={(e) => setNewCompetitor({...newCompetitor, company_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Discover Pages
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Select pages to track:</h4>
              <div className="space-y-2 mb-4">
                {suggestions.map((suggestion, index) => (
                  <label key={index} className="flex items-center">
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
                      className="mr-3"
                    />
                    <span className="text-sm">
                      <span className="font-medium">{suggestion.page_type}</span> - {suggestion.url}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSavePages}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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
          <div key={competitor.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{competitor.company_name}</h3>
                <p className="text-sm text-gray-600">{competitor.domain}</p>
              </div>
              <button
                onClick={() => handleDeleteCompetitor(competitor.id)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{competitor.tracked_pages?.length || 0}</span> pages tracked
              </p>
              {competitor.tracked_pages?.map((page, index) => (
                <div key={index} className="text-xs text-gray-500">
                  {page.page_type} - {page.url.split('/').pop() || 'homepage'}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => handleScan(competitor.id)}
              disabled={scanning[competitor.id]}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {scanning[competitor.id] ? 'Scanning...' : 'Manual Scan'}
            </button>
          </div>
        ))}
      </div>

      {competitors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No competitors yet</h3>
          <p className="text-gray-600 mb-4">Add your first competitor to start monitoring their changes</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
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

  const getSignificanceColor = (score) => {
    if (score >= 4) return 'text-red-600 bg-red-100';
    if (score >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Changes</h2>
      
      {changes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No changes detected yet</h3>
          <p className="text-gray-600">Run scans on your competitors to see changes appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {changes.map((change) => (
            <div key={change.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {getCompetitorName(change.competitor_id)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(change.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSignificanceColor(change.significance_score)}`}>
                  Priority {change.significance_score}/5
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">What Changed:</h4>
                  <p className="text-gray-700">{change.change_summary}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Strategic Implications:</h4>
                  <p className="text-gray-700">{change.strategic_implications}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Suggested Actions:</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
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