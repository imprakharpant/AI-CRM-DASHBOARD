import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Sparkles, Radio, BarChart3, Activity, Terminal, Menu, X,
  Lock, Mail, LogOut, Eye, EyeOff, AlertCircle, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CampaignBuilder from './pages/CampaignBuilder';
import CampaignMonitor from './pages/CampaignMonitor';
import Analytics from './pages/Analytics';
import ChannelMonitor from './pages/ChannelMonitor';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

interface User {
  id: number;
  name: string;
  email: string;
}

// Global Fetch Interceptor to automatically attach token
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const inputStr = typeof input === 'string' ? input : (input as Request).url || '';
  const isApiCall = typeof inputStr === 'string' && (inputStr.startsWith(API_URL) || inputStr.startsWith('/api') || inputStr.includes('/api/'));
  
  if (isApiCall) {
    const token = localStorage.getItem('xeno_token');
    if (token) {
      init = init || {};
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', `Bearer ${token}`);
        }
      } else if (Array.isArray(init.headers)) {
        const hasAuth = init.headers.some(([k]) => k.toLowerCase() === 'authorization');
        if (!hasAuth) {
          init.headers.push(['Authorization', `Bearer ${token}`]);
        }
      } else {
        const headersRecord = init.headers as Record<string, string>;
        if (!headersRecord['Authorization'] && !headersRecord['authorization']) {
          headersRecord['Authorization'] = `Bearer ${token}`;
        }
      }
    }
  }
  
  const response = await originalFetch(input, init);
  
  // If unauthorized, clear local session and trigger event to update App state
  if (response.status === 401 && isApiCall && typeof inputStr === 'string' && !inputStr.includes('/api/auth/login') && !inputStr.includes('/api/auth/register')) {
    localStorage.removeItem('xeno_token');
    localStorage.removeItem('xeno_user');
    window.dispatchEvent(new Event('xeno_logout'));
  }
  
  return response;
};

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'builder', label: 'AI Campaigns', icon: Sparkles, highlight: true },
  { id: 'monitor', label: 'Campaign Monitor', icon: Radio },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'channel', label: 'Channel Monitor', icon: Activity },
];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const url = `${API_URL}/api/auth/${isRegister ? 'register' : 'login'}`;
      const payload = isRegister ? { email, password, name } : { email, password };
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('xeno_token', data.access_token);
      localStorage.setItem('xeno_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@xeno.ai');
    setPassword('admin123');
    setIsRegister(false);
    setError('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-deep-space dot-grid-bg px-4 relative overflow-hidden">
      {/* Ambient radial glows */}
      <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-accent/[0.04] rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/[0.02] rounded-full blur-[120px] pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md bg-surface/75 backdrop-blur-xl border border-border-subtle p-8 rounded-2xl shadow-card relative z-10"
      >
        {/* Top glow indicator */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl accent-gradient flex items-center justify-center shadow-glow-accent mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-txt-primary" />
          </div>
          <h1 className="font-display font-bold text-txt-primary text-xl tracking-wide">XENO AI CRM</h1>
          <p className="text-xs text-txt-secondary mt-1">AI-Powered Customer Engagement Platform</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-elevated/40 border border-border-subtle p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 ${
              !isRegister ? 'bg-accent text-txt-primary shadow-glow-accent/20' : 'text-txt-muted hover:text-txt-primary'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 ${
              isRegister ? 'bg-accent text-txt-primary shadow-glow-accent/20' : 'text-txt-muted hover:text-txt-primary'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 mb-5"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted">
                <Users className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-elevated/30 border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-[13px] text-txt-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all duration-200 placeholder-txt-muted"
                required={isRegister}
              />
            </div>
          )}

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full bg-elevated/30 border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-[13px] text-txt-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all duration-200 placeholder-txt-muted"
              required
            />
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-elevated/30 border border-border-subtle rounded-xl pl-10 pr-10 py-3 text-[13px] text-txt-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all duration-200 placeholder-txt-muted"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary transition-colors duration-150 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-accent hover:bg-accent-light text-txt-primary font-semibold text-xs tracking-wider uppercase transition-all duration-300 shadow-glow-accent hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Option */}
        {!isRegister && (
          <div className="mt-6 pt-5 border-t border-border-subtle text-center">
            <p className="text-[11px] text-txt-muted mb-3">Want to try without registering?</p>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-xs text-accent-light hover:text-txt-primary transition-all duration-150 bg-accent/10 border border-accent/20 px-4 py-2.5 rounded-xl inline-flex items-center gap-2"
            >
              Quick Login as Administrator
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<string>('dashboard');
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('xeno_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('xeno_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('xeno_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      setPage('dashboard');
    };
    window.addEventListener('xeno_logout', handleLogoutEvent);
    return () => window.removeEventListener('xeno_logout', handleLogoutEvent);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('xeno_token');
    localStorage.removeItem('xeno_user');
    setUser(null);
    setPage('dashboard');
  };

  const renderActivePage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard setPage={setPage} setCampaignId={setCampaignId} />;
      case 'customers':
        return <Customers />;
      case 'builder':
        return <CampaignBuilder setPage={setPage} setCampaignId={setCampaignId} />;
      case 'monitor':
        return <CampaignMonitor campaignId={campaignId} setCampaignId={setCampaignId} />;
      case 'analytics':
        return <Analytics />;
      case 'channel':
        return <ChannelMonitor />;
      default:
        return <Dashboard setPage={setPage} setCampaignId={setCampaignId} />;
    }
  };

  const handleNavClick = (id: string) => {
    setPage(id);
    setIsSidebarOpen(false);
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={setUser} />;
  }

  return (
    <div className="flex min-h-screen bg-deep-space text-txt-primary">
      {/* Mobile Header Bar */}
      <header className="lg:hidden w-full h-16 bg-surface border-b border-border-subtle flex items-center justify-between px-6 fixed top-0 left-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl accent-gradient flex items-center justify-center shadow-glow-accent">
            <Sparkles className="w-4 h-4 text-txt-primary" />
          </div>
          <span className="font-display font-bold text-txt-primary text-[15px] tracking-wide">Xeno CRM</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-txt-muted hover:text-accent-light rounded-xl bg-elevated/50 hover:bg-elevated transition-colors duration-150"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-txt-muted hover:text-txt-primary rounded-xl bg-elevated/50 hover:bg-elevated transition-colors duration-150"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className={`sidebar w-64 flex flex-col justify-between fixed h-full z-40 transition-transform duration-300 lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          {/* Brand */}
          <div className="px-6 py-6 flex items-center justify-between lg:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shadow-glow-accent">
                <Sparkles className="w-[18px] h-[18px] text-txt-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-txt-primary text-[15px] tracking-wide">Xeno CRM</h2>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl hover:bg-elevated text-txt-muted hover:text-txt-primary transition-colors duration-150"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-3 mt-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-medium transition-all duration-300 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive
                      ? 'text-txt-primary'
                      : 'text-txt-muted hover:text-txt-secondary hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/[0.12] via-accent/[0.06] to-transparent border border-accent/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_0_12px_rgba(99,102,241,0.12)]"
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    >
                      {/* Left glowing vertical accent bar */}
                      <div className="absolute left-0 top-[10px] bottom-[10px] w-[3px] rounded-r bg-gradient-to-b from-accent-light to-accent shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    </motion.div>
                  )}
                  <Icon className={`w-[18px] h-[18px] relative z-10 transition-colors duration-300 ${isActive ? 'text-accent-light' : ''}`} />
                  <span className="relative z-10 transition-colors duration-300">{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse relative z-10" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {/* User Profile Info & Logout */}
          {user && (
            <div className="px-4 py-3.5 border-t border-border-subtle flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent-light font-display font-bold text-xs shadow-glow-accent/10">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-txt-primary truncate">{user.name}</p>
                <p className="text-[10px] text-txt-muted truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-txt-muted hover:text-accent-light hover:bg-elevated transition-all duration-150 focus:outline-none"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 focus:outline-none"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Footer status */}
          <div className="px-4 py-4 border-t border-border-subtle bg-[var(--skeleton-bg)]">
            <div className="flex items-center gap-2 text-[11px] text-txt-muted font-medium">
              <Terminal className="w-3.5 h-3.5 text-accent" />
              <span>Simulator</span>
              <span className="ml-auto flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0 min-h-screen dot-grid-bg relative overflow-x-hidden">
        {/* Ambient radial glows */}
        <div className="absolute top-12 right-12 w-[450px] h-[450px] bg-cyan-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-12 left-1/3 w-[550px] h-[550px] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/[0.02] rounded-full blur-[130px] pointer-events-none z-0" />

        <div className="max-w-[1200px] mx-auto px-8 py-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderActivePage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
