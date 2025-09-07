import React, { useEffect, useRef, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar } from "recharts";
import { TrendingUp, TrendingDown, Search, History, Star, AlertTriangle, DollarSign, Activity, Users, Zap, Shield, Award, Bell, BookOpen, Calculator, Plus, Trash2, Edit3, Target, PieChart as PieChartIcon } from "lucide-react";

const API_BASE_URL = "http://localhost:5174/api";

function App() {
  const [coin, setCoin] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(0);
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioPerformance, setPortfolioPerformance] = useState(null);
  const [showAddToPortfolio, setShowAddToPortfolio] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ amount: '', purchase_price: '', notes: '' });

  const timeoutRef = useRef();

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio`);
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };

  const fetchPortfolioPerformance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/performance`);
      if (response.ok) {
        const data = await response.json();
        setPortfolioPerformance(data);
      }
    } catch (error) {
      console.error('Error fetching portfolio performance:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites`);
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchSearchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/history`);
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data);
      }
    } catch (error) {
      console.error('Error fetching search history:', error);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchPortfolioPerformance();
    fetchFavorites();
    fetchSearchHistory();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'portfolio' || activeTab === 'portfolio-view') {
        fetchPortfolioPerformance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebounced(coin.trim()), 600);
    return () => clearTimeout(timeoutRef.current);
  }, [coin]);

  useEffect(() => {
    if (!debounced) {
      setResult(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setResult(null);
      try {
        const res = await fetch(`${API_BASE_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coin: debounced }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setResult(data);

        fetchSearchHistory();

        setNotifications(prev => [{
          id: Date.now(),
          message: `Analysis complete for ${debounced}`,
          type: 'success',
          timestamp: new Date()
        }, ...prev.slice(0, 4)]);

      } catch (err) {
        if (err.name !== "AbortError") {
          setResult({ error: err.message });
          setNotifications(prev => [{
            id: Date.now(),
            message: `Error analyzing ${debounced}: ${err.message}`,
            type: 'error',
            timestamp: new Date()
          }, ...prev.slice(0, 4)]);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debounced]);

  const addToFavorites = async (coinName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coin: coinName })
      });

      if (response.ok) {
        await fetchFavorites();
        setNotifications(prev => [{
          id: Date.now(),
          message: `${coinName} added to favorites`,
          type: 'success',
          timestamp: new Date()
        }, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  const removeFromFavorites = async (coinName) => {
    try {
      await fetch(`${API_BASE_URL}/favorites/${coinName.toLowerCase()}`, {
        method: 'DELETE'
      });
      await fetchFavorites();
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  const addToPortfolio = async () => {
    try {
      if (!result || !debounced || !portfolioForm.amount || !portfolioForm.purchase_price) {
        setNotifications(prev => [
          {
            id: Date.now(),
            message: 'Item removed from portfolio',
            type: 'success',
            timestamp: new Date()
          },
          ...prev.slice(0, 4)
        ]);
        return; 
      }
    } catch (error) {
      console.error('Error removing from portfolio:', error);
    }
  };


  const formatLargeNumber = (num) => {
    if (typeof num !== 'number') return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getRiskColor = (flags) => {
    if (!Array.isArray(flags)) return '#48ca48';
    if (flags.includes('high_volatility') && flags.includes('speculative')) return '#ff6b6b';
    if (flags.includes('high_volatility') || flags.includes('speculative')) return '#feca57';
    return '#48ca48';
  };

  const theme = {
    bg: darkMode ? '#1a1a2e' : '#f8fafc',
    cardBg: darkMode ? '#16213e' : '#ffffff',
    text: darkMode ? '#e2e8f0' : '#2d3748',
    border: darkMode ? '#2d3748' : '#e2e8f0'
  };

  const isFavorite = (coinName) => {
    return favorites.some(f => f.coin === coinName.toLowerCase());
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: "Inter, system-ui, Arial",
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={32} />
            MemeScope Pro
          </h1>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            <div style={{ position: 'relative' }}>
              <Bell size={20} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#ff6b6b',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {notifications.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>

        {/* Search Section */}
        <div style={{
          background: theme.cardBg,
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: `1px solid ${theme.border}`,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={20} />
            <input
              value={coin}
              onChange={(e) => setCoin(e.target.value)}
              placeholder="Enter memecoin name (e.g. 'shiba inu', 'dogecoin', 'pepe')"
              style={{
                width: '100%',
                padding: "12px 12px 12px 45px",
                fontSize: 16,
                borderRadius: 8,
                border: `2px solid ${theme.border}`,
                background: theme.bg,
                color: theme.text,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>

          {/* Search History & Favorites */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {searchHistory.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Recent Searches</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {searchHistory.slice(0, 5).map(item => (
                    <button
                      key={item.coin}
                      onClick={() => setCoin(item.display_name || item.coin)}
                      style={{
                        padding: '4px 8px',
                        background: '#e5e7eb',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#374151'
                      }}
                    >
                      {item.display_name || item.coin}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {favorites.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>Favorites</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {favorites.map(fav => (
                    <button
                      key={fav.coin}
                      onClick={() => setCoin(fav.display_name || fav.coin)}
                      style={{
                        padding: '4px 8px',
                        background: '#fef3c7',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Star size={10} />
                      {fav.display_name || fav.coin}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            background: theme.cardBg,
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '15px' }}>Analyzing "{debounced}"...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Results Section */}
        {!loading && result && !result.error && (
          <>
            {/* Quick Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: theme.cardBg,
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <DollarSign style={{ color: '#10b981', background: '#d1fae5', padding: '8px', borderRadius: '8px' }} size={40} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Current Price</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>${result.current_price}</p>
                </div>
              </div>

              <div style={{
                background: theme.cardBg,
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <Activity style={{
                  color: (result.price_change_24h || 0) >= 0 ? '#10b981' : '#ef4444',
                  background: (result.price_change_24h || 0) >= 0 ? '#d1fae5' : '#fee2e2',
                  padding: '8px',
                  borderRadius: '8px'
                }} size={40} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>24h Change</p>
                  <p style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: (result.price_change_24h || 0) >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {(result.price_change_24h || 0) >= 0 ? '+' : ''}{(result.price_change_24h || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              <div style={{
                background: theme.cardBg,
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <Users style={{ color: '#3b82f6', background: '#dbeafe', padding: '8px', borderRadius: '8px' }} size={40} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Social Score</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{result.social_trend_score || 0}/100</p>
                </div>
              </div>

              <div style={{
                background: theme.cardBg,
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <Shield style={{
                  color: getRiskColor(result.risk_flags),
                  background: getRiskColor(result.risk_flags) + '20',
                  padding: '8px',
                  borderRadius: '8px'
                }} size={40} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Risk Level</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: getRiskColor(result.risk_flags) }}>
                    {result.risk_flags?.length > 2 ? 'High' : result.risk_flags?.length > 1 ? 'Medium' : 'Low'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => isFavorite(debounced) ? removeFromFavorites(debounced) : addToFavorites(debounced)}
                style={{
                  padding: '8px 16px',
                  background: isFavorite(debounced) ? '#ef4444' : '#fbbf24',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Star size={16} />
                {isFavorite(debounced) ? 'Remove from Favorites' : 'Add to Favorites'}
              </button>

              <button
                onClick={() => setShowAddToPortfolio(true)}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Plus size={16} />
                Add to Portfolio
              </button>

              <button
                onClick={() => setActiveTab('portfolio-view')}
                style={{
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <PieChartIcon size={16} />
                View Portfolio
              </button>
            </div>

            {/* Add to Portfolio Modal */}
            {showAddToPortfolio && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  background: theme.cardBg,
                  padding: '30px',
                  borderRadius: '12px',
                  width: '90%',
                  maxWidth: '400px',
                  border: `1px solid ${theme.border}`
                }}>
                  <h3 style={{ marginTop: 0 }}>Add {debounced} to Portfolio</h3>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Amount *</label>
                    <input
                      type="number"
                      value={portfolioForm.amount}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount of tokens"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '6px',
                        background: theme.bg,
                        color: theme.text
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Purchase Price (USD) *</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={portfolioForm.purchase_price}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, purchase_price: e.target.value }))}
                      placeholder="Enter purchase price per token"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '6px',
                        background: theme.bg,
                        color: theme.text
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Notes</label>
                    <textarea
                      value={portfolioForm.notes}
                      onChange={(e) => setPortfolioForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Optional notes about this investment"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '6px',
                        background: theme.bg,
                        color: theme.text,
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowAddToPortfolio(false);
                        setPortfolioForm({ amount: '', purchase_price: '', notes: '' });
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addToPortfolio}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Add to Portfolio
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              marginBottom: '20px',
              background: theme.cardBg,
              borderRadius: '8px',
              padding: '4px',
              border: `1px solid ${theme.border}`,
              overflowX: 'auto'
            }}>
              {['overview', 'charts', 'social', 'risk', 'portfolio', 'portfolio-view'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: '1',
                    minWidth: '120px',
                    padding: '10px 15px',
                    background: activeTab === tab ? '#667eea' : 'transparent',
                    color: activeTab === tab ? 'white' : theme.text,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontWeight: activeTab === tab ? 'bold' : 'normal',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab === 'portfolio-view' ? 'Portfolio View' : tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div style={{
                background: theme.cardBg,
                padding: '25px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Award style={{ color: '#667eea' }} size={24} />
                  Analysis Summary
                </h3>

                <div style={{ marginBottom: '20px', padding: '15px', background: theme.bg, borderRadius: '8px' }}>
                  <p style={{ margin: 0, lineHeight: '1.6' }}>{result.summary}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <h4>Key Metrics</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      <li style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <strong>Market Cap:</strong> {result.market_cap_estimate}
                      </li>
                      <li style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <strong>24h Volume:</strong> ${formatLargeNumber(result.volume_24h)}
                      </li>
                      <li style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <strong>Holders:</strong> {formatLargeNumber(result.holder_count)}
                      </li>
                      <li style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <strong>Liquidity:</strong> {result.liquidity_estimate}
                      </li>
                      <li style={{ padding: '8px 0' }}>
                        <strong>Market Rank:</strong> #{result.market_rank}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4>Risk Flags</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {result.risk_flags?.map(flag => (
                        <span
                          key={flag}
                          style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '6px',
                            fontSize: '14px',
                            textTransform: 'capitalize',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <AlertTriangle size={16} />
                          {flag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'charts' && (
              <div style={{
                background: theme.cardBg,
                padding: '25px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ marginTop: 0 }}>Price History & Analytics</h3>

                {result.price_history && result.price_history.length > 0 ? (
                  <>
                    <div style={{ height: '400px', marginBottom: '30px' }}>
                      <h4>Price Chart (Last 30 Days)</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.price_history}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#667eea" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <YAxis
                            tickFormatter={(value) => `${value.toFixed(8)}`}
                          />
                          <CartesianGrid strokeDasharray="3 3" />
                          <Tooltip
                            formatter={(value) => [`${value}`, 'Price']}
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                            labelStyle={{ color: theme.text }}
                            contentStyle={{
                              backgroundColor: theme.cardBg,
                              border: `1px solid ${theme.border}`,
                              borderRadius: '6px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#667eea"
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ height: '300px' }}>
                      <h4>Volume Analysis</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={result.price_history.slice(-10)}>
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <YAxis
                            tickFormatter={(value) => formatLargeNumber(value)}
                          />
                          <CartesianGrid strokeDasharray="3 3" />
                          <Tooltip
                            formatter={(value) => [formatLargeNumber(value), 'Volume']}
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                            contentStyle={{
                              backgroundColor: theme.cardBg,
                              border: `1px solid ${theme.border}`,
                              borderRadius: '6px'
                            }}
                          />
                          <Bar dataKey="volume" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No price history data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'social' && (
              <div style={{
                background: theme.cardBg,
                padding: '25px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ marginTop: 0 }}>Social Media Analytics</h3>

                {result.social_data && result.social_data.length > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                      <div>
                        <h4>Platform Sentiment</h4>
                        <div style={{ height: '250px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={result.social_data}>
                              <XAxis dataKey="platform" />
                              <YAxis />
                              <CartesianGrid strokeDasharray="3 3" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: theme.cardBg,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px'
                                }}
                              />
                              <Bar dataKey="sentiment" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div>
                        <h4>Mentions Distribution</h4>
                        <div style={{ height: '250px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={result.social_data}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="mentions"
                              >
                                {result.social_data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                      <h4>Social Trends</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        {result.social_data.map(platform => (
                          <div
                            key={platform.platform}
                            style={{
                              padding: '15px',
                              background: theme.bg,
                              borderRadius: '8px',
                              border: `1px solid ${theme.border}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <strong>{platform.platform}</strong>
                              <span style={{
                                padding: '2px 8px',
                                background: platform.sentiment > 70 ? '#d1fae5' : platform.sentiment > 50 ? '#fef3c7' : '#fee2e2',
                                color: platform.sentiment > 70 ? '#065f46' : platform.sentiment > 50 ? '#92400e' : '#991b1b',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {platform.sentiment}% positive
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                              {formatLargeNumber(platform.mentions)} mentions
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No social data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'risk' && (
              <div style={{
                background: theme.cardBg,
                padding: '25px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ marginTop: 0 }}>Risk Assessment</h3>

                {result.risk_metrics ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                      <div>
                        <h4>Risk Overview</h4>
                        <div style={{ padding: '20px', background: theme.bg, borderRadius: '8px' }}>
                          <div style={{ marginBottom: '15px' }}>
                            <span style={{ fontWeight: 'bold' }}>Overall Risk Level: </span>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              background: result.risk_metrics.overall_risk === 'high' ? '#fee2e2' :
                                result.risk_metrics.overall_risk === 'medium' ? '#fef3c7' : '#d1fae5',
                              color: result.risk_metrics.overall_risk === 'high' ? '#dc2626' :
                                result.risk_metrics.overall_risk === 'medium' ? '#d97706' : '#059669',
                              textTransform: 'capitalize'
                            }}>
                              {result.risk_metrics.overall_risk}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Volatility Score</span>
                                <span>{result.risk_metrics.volatility_score}%</span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#e5e7eb',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${result.risk_metrics.volatility_score}%`,
                                  height: '100%',
                                  background: '#ef4444',
                                  transition: 'width 0.5s ease'
                                }}></div>
                              </div>
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Liquidity Score</span>
                                <span>{result.risk_metrics.liquidity_score}%</span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#e5e7eb',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${result.risk_metrics.liquidity_score}%`,
                                  height: '100%',
                                  background: '#10b981',
                                  transition: 'width 0.5s ease'
                                }}></div>
                              </div>
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Market Depth</span>
                                <span>{result.risk_metrics.market_depth_score}%</span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#e5e7eb',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${result.risk_metrics.market_depth_score}%`,
                                  height: '100%',
                                  background: '#3b82f6',
                                  transition: 'width 0.5s ease'
                                }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4>Security & Compliance</h4>
                        <div style={{ padding: '20px', background: theme.bg, borderRadius: '8px' }}>
                          <div style={{ marginBottom: '15px' }}>
                            <span style={{ fontWeight: 'bold' }}>Audit Status: </span>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              background: result.risk_metrics.audit_status === 'verified' ? '#d1fae5' : '#fee2e2',
                              color: result.risk_metrics.audit_status === 'verified' ? '#059669' : '#dc2626',
                              textTransform: 'capitalize'
                            }}>
                              {result.risk_metrics.audit_status}
                            </span>
                          </div>

                          <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span>Smart Contract Risk</span>
                              <span>{result.risk_metrics.smart_contract_risk}%</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '8px',
                              background: '#e5e7eb',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${result.risk_metrics.smart_contract_risk}%`,
                                height: '100%',
                                background: result.risk_metrics.smart_contract_risk > 70 ? '#ef4444' :
                                  result.risk_metrics.smart_contract_risk > 40 ? '#f59e0b' : '#10b981',
                                transition: 'width 0.5s ease'
                              }}></div>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span>Team Transparency</span>
                              <span>{result.risk_metrics.team_transparency}%</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '8px',
                              background: '#e5e7eb',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${result.risk_metrics.team_transparency}%`,
                                height: '100%',
                                background: '#8b5cf6',
                                transition: 'width 0.5s ease'
                              }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No risk metrics available</p>
                  </div>
                )}

                <div style={{ marginTop: '30px' }}>
                  <h4>Price Alert Settings</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: theme.bg, borderRadius: '8px' }}>
                    <label>Alert when price changes by:</label>
                    <input
                      type="number"
                      value={alertThreshold}
                      onChange={(e) => setAlertThreshold(e.target.value)}
                      placeholder="0"
                      style={{
                        padding: '8px 12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '6px',
                        background: theme.cardBg,
                        color: theme.text,
                        width: '80px'
                      }}
                    />
                    <span>%</span>
                    <button
                      style={{
                        padding: '8px 16px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Set Alert
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4>Safety Recommendations</h4>
                  <div style={{ padding: '15px', background: '#fef3c7', borderRadius: '8px', color: '#92400e' }}>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>Only invest what you can afford to lose</li>
                      <li>Consider dollar-cost averaging for volatile assets</li>
                      <li>Monitor whale movements and large transactions</li>
                      <li>Keep track of community sentiment changes</li>
                      <li>Set stop-loss orders to limit potential losses</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div style={{
                background: theme.cardBg,
                padding: '25px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ marginTop: 0 }}>Portfolio Management</h3>

                {portfolio.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '30px' }}>
                      <h4>Your Holdings</h4>
                      <div style={{ display: 'grid', gap: '15px' }}>
                        {portfolio.map(item => (
                          <div
                            key={item.id}
                            style={{
                              padding: '20px',
                              background: theme.bg,
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              border: `1px solid ${theme.border}`
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                <h4 style={{ margin: 0, textTransform: 'capitalize' }}>{item.display_name}</h4>
                                <span style={{
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  background: '#e5e7eb',
                                  borderRadius: '4px',
                                  color: '#374151'
                                }}>
                                  {formatLargeNumber(item.amount)} tokens
                                </span>
                              </div>
                              <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>
                                Purchase Price: ${item.purchase_price} | Date: {new Date(item.purchase_date).toLocaleDateString()}
                              </p>
                              {item.notes && (
                                <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                                  {item.notes}
                                </p>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                              <p style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                                {formatCurrency(item.amount * (item.current_price || item.purchase_price))}
                              </p>
                              <p style={{
                                margin: '0 0 10px 0',
                                fontSize: '14px',
                                color: (item.current_price || item.purchase_price) >= item.purchase_price ? '#10b981' : '#ef4444'
                              }}>
                                {(item.current_price || item.purchase_price) >= item.purchase_price ? '+' : ''}
                                {(((item.current_price || item.purchase_price) - item.purchase_price) / item.purchase_price * 100).toFixed(2)}%
                              </p>
                              <button
                                // onClick={() => removeFromPortfolio(item.id)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Trash2 size={12} />
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Calculator size={48} style={{ color: '#9ca3af', marginBottom: '15px' }} />
                    <p style={{ color: '#6b7280', fontSize: '18px' }}>No holdings yet</p>
                    <p style={{ color: '#9ca3af' }}>Add coins to your portfolio to track performance</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'portfolio-view' && (
              <div style={{
                background: theme.cardBg,
                padding: '25px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`
              }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <PieChartIcon style={{ color: '#667eea' }} size={24} />
                  Portfolio Performance
                </h3>

                {portfolioPerformance && portfolio.length > 0 ? (
                  <>
                    {/* Portfolio Summary Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '15px',
                      marginBottom: '30px'
                    }}>
                      <div style={{
                        background: theme.bg,
                        padding: '20px',
                        borderRadius: '12px',
                        border: `1px solid ${theme.border}`,
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Total Invested</p>
                        <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                          {formatCurrency(portfolioPerformance.total_invested)}
                        </p>
                      </div>

                      <div style={{
                        background: theme.bg,
                        padding: '20px',
                        borderRadius: '12px',
                        border: `1px solid ${theme.border}`,
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Current Value</p>
                        <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                          {formatCurrency(portfolioPerformance.current_value)}
                        </p>
                      </div>

                      <div style={{
                        background: theme.bg,
                        padding: '20px',
                        borderRadius: '12px',
                        border: `1px solid ${theme.border}`,
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Total Gains/Loss</p>
                        <p style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: portfolioPerformance.total_gains >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {portfolioPerformance.total_gains >= 0 ? '+' : ''}{formatCurrency(portfolioPerformance.total_gains)}
                        </p>
                      </div>

                      <div style={{
                        background: theme.bg,
                        padding: '20px',
                        borderRadius: '12px',
                        border: `1px solid ${theme.border}`,
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Return %</p>
                        <p style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: portfolioPerformance.total_gains_percentage >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {portfolioPerformance.total_gains_percentage >= 0 ? '+' : ''}{portfolioPerformance.total_gains_percentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Portfolio Performance Chart */}
                    {portfolioPerformance.performance_history && portfolioPerformance.performance_history.length > 0 && (
                      <div style={{ marginBottom: '30px' }}>
                        <h4>Portfolio Value Over Time</h4>
                        <div style={{ height: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={portfolioPerformance.performance_history}>
                              <defs>
                                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="date" />
                              <YAxis tickFormatter={(value) => formatCurrency(value)} />
                              <CartesianGrid strokeDasharray="3 3" />
                              <Tooltip
                                formatter={(value, name) => [formatCurrency(value), name === 'portfolio_value' ? 'Portfolio Value' : 'Gains']}
                                labelStyle={{ color: theme.text }}
                                contentStyle={{
                                  backgroundColor: theme.cardBg,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px'
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="portfolio_value"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorPortfolio)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Holdings Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' }}>
                      <div>
                        <h4>Holdings Breakdown</h4>
                        <div style={{ height: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={portfolioPerformance.holdings_breakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="current_value"
                              >
                                {portfolioPerformance.holdings_breakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div>
                        <h4>Performance by Asset</h4>
                        <div style={{ height: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={portfolioPerformance.holdings_breakdown}>
                              <XAxis dataKey="coin" />
                              <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
                              <CartesianGrid strokeDasharray="3 3" />
                              <Tooltip
                                formatter={(value) => [`${value.toFixed(2)}%`, 'Return']}
                                contentStyle={{
                                  backgroundColor: theme.cardBg,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px'
                                }}
                              />
                              <Bar
                                dataKey="gains_percentage"
                                fill={(entry) => entry >= 0 ? '#10b981' : '#ef4444'}
                              >
                                {portfolioPerformance.holdings_breakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.gains_percentage >= 0 ? '#10b981' : '#ef4444'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Best and Worst Performers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                      {portfolioPerformance.best_performer && (
                        <div style={{
                          padding: '20px',
                          background: '#d1fae5',
                          borderRadius: '8px',
                          border: '1px solid #a7f3d0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <TrendingUp style={{ color: '#059669' }} size={24} />
                            <h4 style={{ margin: 0, color: '#059669' }}>Best Performer</h4>
                          </div>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#065f46', textTransform: 'capitalize' }}>
                            {portfolioPerformance.best_performer.coin}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#059669' }}>
                            +{portfolioPerformance.best_performer.gains_percentage.toFixed(2)}%
                          </p>
                          <p style={{ margin: 0, color: '#059669' }}>
                            {formatCurrency(portfolioPerformance.best_performer.gains)}
                          </p>
                        </div>
                      )}

                      {portfolioPerformance.worst_performer && portfolioPerformance.worst_performer.gains_percentage < 0 && (
                        <div style={{
                          padding: '20px',
                          background: '#fee2e2',
                          borderRadius: '8px',
                          border: '1px solid #fecaca'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <TrendingDown style={{ color: '#dc2626' }} size={24} />
                            <h4 style={{ margin: 0, color: '#dc2626' }}>Worst Performer</h4>
                          </div>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#991b1b', textTransform: 'capitalize' }}>
                            {portfolioPerformance.worst_performer.coin}
                          </p>
                          <p style={{ margin: '0 0 5px 0', color: '#dc2626' }}>
                            {portfolioPerformance.worst_performer.gains_percentage.toFixed(2)}%
                          </p>
                          <p style={{ margin: 0, color: '#dc2626' }}>
                            {formatCurrency(portfolioPerformance.worst_performer.gains)}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <PieChartIcon size={64} style={{ color: '#9ca3af', marginBottom: '20px' }} />
                    <h4 style={{ color: '#6b7280', marginBottom: '10px' }}>No Portfolio Data</h4>
                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                      Add some coins to your portfolio to see performance analytics
                    </p>
                    <button
                      onClick={() => setActiveTab('portfolio')}
                      style={{
                        padding: '10px 20px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Plus size={16} />
                      Add Your First Investment
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Error State */}
        {!loading && result?.error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} />
              <div>
                <strong>Error occurred</strong>
                <p style={{ margin: '5px 0 0 0' }}>{result.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '300px',
            zIndex: 1000
          }}>
            {notifications.slice(0, 3).map(notification => (
              <div
                key={notification.id}
                style={{
                  background: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
                  color: notification.type === 'success' ? '#065f46' : '#991b1b',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>{notification.message}</p>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: theme.cardBg,
          borderRadius: '12px',
          border: `1px solid ${theme.border}`,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>MemeScope Pro</strong> - Advanced Memecoin Analysis Platform
          </p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Features: Real-time analysis • Social sentiment tracking • Risk assessment • Portfolio management • Price alerts • Historical data • Technical indicators • Community metrics • Whale tracking • Performance analytics
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;