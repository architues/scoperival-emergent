import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

// Use Vercel's environment or fallback to current domain
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
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
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/login`, { email, password });
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
      const response = await axios.post(`${API}/register`, {
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

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthContext>
        {({ user, login, register, logout, isAuthenticated }) => (
          <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
              <div className="text-center">
                <Logo size="large" />
                <h1 className="text-2xl font-bold text-gray-900 mt-4">Scoperival</h1>
                <p className="text-gray-600 mt-2">AI-Powered Competitor Intelligence</p>
                <p className="text-gray-500 text-sm mt-4">Deploying to Vercel...</p>
                <div className="mt-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AuthContext>
    </div>
  );
}

export default App;