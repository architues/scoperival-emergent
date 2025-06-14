import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

// Use environment variable or fallback to current domain for API
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/login`, { email, password });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (email, password, company_name) => {
    try {
      const response = await axios.post(`${API}/register`, {
        email,
        password,
        company_name
      });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
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
  };

  return (
    <div className="auth-context">
      {children({ user, login, register, logout, isAuthenticated: !!token })}
    </div>
  );
};

// Logo Component
const Logo = ({ size = "default" }) => {
  const sizeClasses = {
    small: "text-lg",
    default: "text-xl", 
    large: "text-3xl"
  };

  return (
    <div className={`logo ${sizeClasses[size]} flex items-center justify-center`}>
      <div className="logo-icon mr-3">
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-blue-500">
          <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 12L2 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent font-bold">
        Scoperival
      </span>
    </div>
  );
};

// Auth Form Component
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <Logo size="large" />
          <p className="text-slate-300 mt-4">AI-Powered Competitor Intelligence</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your company name"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center">
            <Logo size="large" />
            <h1 className="text-4xl font-bold text-white mt-6 mb-4">Welcome to Scoperival!</h1>
            <p className="text-slate-300 text-lg mb-8">
              Your AI-powered competitor intelligence platform is ready.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-500/20 rounded-lg p-6 border border-blue-500/30">
                <div className="text-3xl mb-2">🔍</div>
                <h3 className="text-white font-semibold mb-2">Monitor Competitors</h3>
                <p className="text-slate-300 text-sm">Track changes on competitor websites automatically</p>
              </div>
              
              <div className="bg-purple-500/20 rounded-lg p-6 border border-purple-500/30">
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="text-white font-semibold mb-2">AI Analysis</h3>
                <p className="text-slate-300 text-sm">Get strategic insights powered by OpenAI</p>
              </div>
              
              <div className="bg-green-500/20 rounded-lg p-6 border border-green-500/30">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="text-white font-semibold mb-2">Real-time Alerts</h3>
                <p className="text-slate-300 text-sm">Receive notifications for important changes</p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-slate-400 mb-4">
                🎉 Successfully deployed on Vercel! The full dashboard is coming soon.
              </p>
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-600 to-red-500 text-white py-2 px-6 rounded-lg font-semibold hover:from-red-700 hover:to-red-600 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
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