import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
    TrendingUp, TrendingDown, Bell, Plus, Trash2, LogOut, Activity, Search, AlertCircle
} from 'lucide-react';

const API_GATEWAY = 'http://localhost:3000/api';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [tracked, setTracked] = useState([]);
    const [prices, setPrices] = useState({});
    const [selectedStock, setSelectedStock] = useState(null);
    const [historical, setHistorical] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [newStock, setNewStock] = useState('');

    const [alertTarget, setAlertTarget] = useState('');
    const [alertCondition, setAlertCondition] = useState('above');

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token || !userData) {
            navigate('/login');
            return;
        }
        setUser(JSON.parse(userData));
        fetchDashboardData(token);
    }, [navigate]);

    const getHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchDashboardData = async (token) => {
        try {
            // Fetch tracked list
            const trackedRes = await axios.get(`${API_GATEWAY}/users/tracked`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const symbols = trackedRes.data;
            setTracked(symbols);

            if (symbols.length > 0) {
                if (!selectedStock) setSelectedStock(symbols[0]);
                fetchPrices(symbols);
            }

            fetchAlerts(token);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        }
    };

    const fetchPrices = async (symbols) => {
        try {
            const res = await axios.post(`${API_GATEWAY}/stocks/prices`, { symbols });
            const newPrices = {};
            res.data.forEach(item => {
                newPrices[item.symbol] = item;
            });
            setPrices(newPrices);
        } catch (err) {
            console.error('Failed to fetch prices');
        }
    };

    const fetchHistorical = async (symbol) => {
        try {
            const res = await axios.get(`${API_GATEWAY}/stocks/historical/${symbol}`);
            const formatted = res.data.map(d => ({
                date: new Date(d.date).toLocaleDateString(),
                price: d.close
            }));
            setHistorical(formatted);
        } catch (err) {
            console.error('Failed to fetch historical data');
        }
    };

    const fetchAlerts = async (token) => {
        try {
            const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : getHeaders();
            const res = await axios.get(`${API_GATEWAY}/users/alerts`, authHeader);
            setAlerts(res.data);
        } catch (err) {
            console.error('Failed to fetch alerts');
        }
    };

    useEffect(() => {
        if (selectedStock) {
            fetchHistorical(selectedStock);
        }
        const interval = setInterval(() => {
            if (tracked.length > 0) fetchPrices(tracked);
        }, 30000);
        return () => clearInterval(interval);
    }, [selectedStock, tracked]);

    const handleAddStock = async (e) => {
        e.preventDefault();
        if (!newStock) return;
        try {
            await axios.post(`${API_GATEWAY}/users/track`, { symbol: newStock }, getHeaders());
            setNewStock('');
            fetchDashboardData(localStorage.getItem('token'));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to track stock');
        }
    };

    const handleRemoveStock = async (symbol) => {
        try {
            await axios.delete(`${API_GATEWAY}/users/track/${symbol}`, getHeaders());
            if (selectedStock === symbol) setSelectedStock(null);
            fetchDashboardData(localStorage.getItem('token'));
        } catch (err) {
            alert('Failed to remove stock');
        }
    };

    const handleAddAlert = async (e) => {
        e.preventDefault();
        if (!selectedStock || !alertTarget) return;
        try {
            await axios.post(`${API_GATEWAY}/users/alerts`, {
                symbol: selectedStock,
                target_price: alertTarget,
                condition: alertCondition
            }, getHeaders());
            setAlertTarget('');
            fetchAlerts();
        } catch (err) {
            alert('Failed to add alert');
        }
    };

    const handleDeleteAlert = async (id) => {
        try {
            await axios.delete(`${API_GATEWAY}/users/alerts/${id}`, getHeaders());
            fetchAlerts();
        } catch (err) {
            alert('Failed to delete alert');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-slate-800/50 border-r border-slate-700/50 flex flex-col p-4 backdrop-blur-xl z-20 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                            <Activity className="w-6 h-6 text-blue-400" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                            StockTrack
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleAddStock} className="mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-500 transition-all text-white uppercase"
                            placeholder="Add Ticker (e.g., AAPL)"
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value.toUpperCase())}
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                        <button type="submit" className="absolute right-2 top-2 p-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Watchlist</h2>
                    {tracked.length === 0 && (
                        <div className="text-center text-slate-500 pt-8 text-sm">No stocks tracked yet.</div>
                    )}
                    {tracked.map(symbol => {
                        const data = prices[symbol];
                        const isSelected = selectedStock === symbol;
                        const isPositive = data?.change >= 0;

                        return (
                            <div
                                key={symbol}
                                onClick={() => setSelectedStock(symbol)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected
                                        ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-white'
                                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/30 text-slate-300'
                                    }`}
                            >
                                <div>
                                    <div className="font-bold text-lg">{symbol}</div>
                                    <div className={`text-xs flex items-center ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                        {data?.changePercent ? `${data.changePercent.toFixed(2)}%` : '---'}
                                    </div>
                                </div>
                                <div className="text-right flex items-center">
                                    <span className="font-medium mr-4">{data?.price ? `$${data.price.toFixed(2)}` : '---'}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveStock(symbol); }}
                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-300">{user.username}</span>
                    </div>
                    <button onClick={logout} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1a] to-black">
                {selectedStock ? (
                    <div className="flex-1 overflow-y-auto p-8 z-10 custom-scrollbar">

                        <header className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6">
                            <div>
                                <h1 className="text-5xl font-black text-white tracking-tight">{selectedStock}</h1>
                                <div className="text-slate-400 mt-2 text-sm">Real-time Stock Overview</div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold font-mono">
                                    {prices[selectedStock]?.price ? `$${prices[selectedStock]?.price.toFixed(2)}` : 'Loading...'}
                                </div>
                                <div className={`text-lg font-medium flex items-center justify-end mt-1 ${prices[selectedStock]?.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {prices[selectedStock]?.change >= 0 ? '+' : ''}{prices[selectedStock]?.change?.toFixed(2)}
                                    ({prices[selectedStock]?.changePercent?.toFixed(2)}%)
                                </div>
                            </div>
                        </header>

                        {/* Chart Area */}
                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-8 backdrop-blur-sm shadow-xl h-96">
                            {historical.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={historical} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorPrice)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <div className="animate-pulse flex items-center">
                                        <Activity className="w-5 h-5 mr-2" />
                                        Loading chart data...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Alerts Section */}
                        <div>
                            <div className="flex items-center mb-6">
                                <Bell className="w-5 h-5 mr-2 text-cyan-400" />
                                <h2 className="text-xl font-bold">Price Alerts</h2>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Create Alert */}
                                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm h-fit">
                                    <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider mb-4">New Alert for {selectedStock}</h3>
                                    <form onSubmit={handleAddAlert} className="space-y-4">
                                        <div className="flex space-x-2">
                                            <select
                                                value={alertCondition}
                                                onChange={(e) => setAlertCondition(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                                            >
                                                <option value="above">Above</option>
                                                <option value="below">Below</option>
                                            </select>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="Target Price"
                                                value={alertTarget}
                                                onChange={(e) => setAlertTarget(e.target.value)}
                                                className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                                            />
                                        </div>
                                        <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-lg font-semibold shadow-lg shadow-blue-500/20 transition-all text-sm flex items-center justify-center">
                                            <Plus className="w-4 h-4 mr-1" /> Create Alert
                                        </button>
                                    </form>
                                </div>

                                {/* Active Alerts List */}
                                <div className="lg:col-span-2 space-y-3">
                                    {alerts.filter(a => a.symbol === selectedStock).length === 0 ? (
                                        <div className="h-full border border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-500 py-8">
                                            No alerts set for {selectedStock}
                                        </div>
                                    ) : (
                                        alerts.filter(a => a.symbol === selectedStock).map(alert => (
                                            <div key={alert.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${alert.is_triggered ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                                <div className="flex items-center">
                                                    <div className={`p-2 rounded-lg mr-4 ${alert.is_triggered ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                        {alert.is_triggered ? <AlertCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">
                                                            Notify me if {alert.symbol} goes <span className={alert.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}>{alert.condition}</span> ${alert.target_price}
                                                        </div>
                                                        <div className="text-xs text-slate-400 mt-1 flex items-center">
                                                            {alert.is_triggered ? (
                                                                <span className="text-red-400 font-medium">Alert Triggered</span>
                                                            ) : 'Waiting for price action...'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteAlert(alert.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center z-10 opacity-60">
                        <div className="w-24 h-24 mb-6 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                            <Activity className="w-10 h-10 text-slate-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-400">Select a stock to view details</h2>
                        <p className="text-slate-500 mt-2">Or add a new ticker from the watchlist panel</p>
                    </div>
                )}

                {/* Decorative elements for main area */}
                <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-blue-500 rounded-full mix-blend-screen filter blur-[120px] opacity-5 pointer-events-none"></div>
            </div>
        </div>
    );
};

export default Dashboard;
