import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, Radio, IndianRupee, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import Counter from '../components/Counter';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface DashboardStats {
  total_customers: number;
  total_orders: number;
  active_campaigns: number;
  store_revenue: number;
  campaign_revenue: number;
  avg_open_rate: number;
}

interface Campaign {
  id: number;
  name: string;
  channel: string;
  audience_size: number;
  status: string;
  created_at: string;
}

interface ChartDataItem {
  name: string;
  open_rate: number;
  click_rate: number;
}

interface DashboardProps {
  setPage: (page: string) => void;
  setCampaignId: (id: number | null) => void;
}

interface KpiCard {
  title: string;
  isNumeric: boolean;
  numericValue: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  accentBg: string;
  prefix?: string;
  suffix?: string;
  sub?: string;
  value?: string;
}

export default function Dashboard({ setPage, setCampaignId }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    total_customers: 0,
    total_orders: 0,
    active_campaigns: 0,
    store_revenue: 0.0,
    campaign_revenue: 0.0,
    avg_open_rate: 0.0,
  });
  
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  useEffect(() => {
    fetchStats();
    fetchRecentCampaigns();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchRecentCampaigns = async () => {
    try {
      const res = await fetch(`${API_URL}/api/campaigns`);
      const data = await res.json();
      setRecentCampaigns(data.slice(0, 5));
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics`);
      const data = await res.json();
      setChartData(data.slice(-5));
    } catch (err) {
      console.error('Error fetching analytics chart:', err);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this campaign? This will remove all associated logs and analytics data.")) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchStats();
        fetchRecentCampaigns();
        fetchChartData();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete campaign");
      }
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert("Connection error when deleting campaign");
    }
  };

  const generateStoreInsights = async () => {
    setLoadingInsight(true);
    try {
      const latestCampaignId = recentCampaigns[0]?.id;
      if (latestCampaignId) {
        const res = await fetch(`${API_URL}/api/ai/insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: latestCampaignId })
        });
        const data = await res.json();
        setAiInsight(data.summary + "\n\nRecommendations:\n" + data.recommendations.map((r: string) => `• ${r}`).join('\n'));
      } else {
        setAiInsight("No campaigns found yet. Launch your first campaign using the AI Campaign Builder to see analytics and recommendations here.");
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      setAiInsight('Failed to generate insights. Check if the backend is running.');
    } finally {
      setLoadingInsight(false);
    }
  };

  const kpiCards: KpiCard[] = [
    { 
      title: 'Total Customers', 
      isNumeric: true,
      numericValue: stats.total_customers,
      icon: Users, 
      accent: 'text-accent-light', 
      accentBg: 'bg-accent-muted' 
    },
    { 
      title: 'Total Orders', 
      isNumeric: true,
      numericValue: stats.total_orders,
      icon: ShoppingBag, 
      accent: 'text-emerald-400', 
      accentBg: 'bg-emerald-400/10' 
    },
    { 
      title: 'Active Campaigns', 
      isNumeric: true,
      numericValue: stats.active_campaigns,
      icon: Radio, 
      accent: 'text-violet-400', 
      accentBg: 'bg-violet-400/10' 
    },
    { 
      title: 'Campaign Revenue', 
      isNumeric: true,
      numericValue: stats.campaign_revenue,
      prefix: '₹',
      icon: IndianRupee, 
      accent: 'text-warm', 
      accentBg: 'bg-warm-muted', 
      sub: stats.store_revenue ? `Store total: ₹${stats.store_revenue.toLocaleString('en-IN')}` : 'Store total: ₹0'
    },
    { 
      title: 'Avg Open Rate', 
      isNumeric: true,
      numericValue: stats.avg_open_rate,
      suffix: '%',
      icon: TrendingUp, 
      accent: 'text-sky-400', 
      accentBg: 'bg-sky-400/10' 
    },
  ];

  const tooltipStyle = {
    backgroundColor: 'var(--tooltip-bg)',
    border: '1px solid var(--tooltip-border)',
    borderRadius: '12px',
    color: 'var(--tooltip-text)',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-txt-primary">Dashboard</h1>
        <p className="text-sm text-txt-secondary mt-1">Real-time engagement metrics and store performance.</p>
      </div>

      {/* KPI Cards */}
      <motion.div 
        className="grid gap-4 md:grid-cols-3 lg:grid-cols-5"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {kpiCards.map((card, idx) => (
          <motion.div
            key={idx}
            variants={fadeUp}
            className="card p-6 group transition-all duration-150 focus-within:ring-2 focus-within:ring-accent outline-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-txt-secondary tracking-wide uppercase">{card.title}</span>
              <div className={`${card.accentBg} p-2 rounded-xl`}>
                <card.icon className={`w-4 h-4 ${card.accent}`} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-display font-bold text-txt-primary tracking-tight flex items-center font-mono">
                {card.prefix && <span className="mr-0.5 select-none">{card.prefix}</span>}
                {card.isNumeric ? (
                  <Counter 
                    value={card.numericValue} 
                    fontSize={24} 
                    fontWeight={700} 
                    padding={0} 
                    gap={0.5} 
                    horizontalPadding={0} 
                    gradientHeight={0}
                  />
                ) : (
                  card.value
                )}
                {card.suffix && <span className="ml-0.5 select-none">{card.suffix}</span>}
              </span>
              {card.sub && <p className="text-[11px] text-txt-secondary mt-1">{card.sub}</p>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + AI Insight Row */}
      <motion.div 
        className="grid gap-6 lg:grid-cols-3"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Chart */}
        <motion.div variants={fadeUp} className="card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-bold text-txt-primary">Campaign Performance</h2>
            <span className="text-[11px] text-txt-secondary">Open & Click Rates (%)</span>
          </div>
          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--chart-axis)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                  />
                  <YAxis 
                    stroke="var(--chart-axis)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                  <Bar dataKey="open_rate" name="Open Rate" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="click_rate" name="Click Rate" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-txt-secondary rounded-xl border border-dashed border-border-subtle">
                No campaign data yet. Create and launch a campaign first.
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Insight Widget */}
        <motion.div variants={fadeUp} className="card p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle ambient glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-xl bg-accent-muted">
                <Sparkles className="w-4 h-4 text-accent-light" />
              </div>
              <h2 className="text-xl font-display font-bold text-txt-primary">AI Store Audit</h2>
            </div>
            
            <p className="text-[13px] text-txt-secondary leading-relaxed mb-6">
              Analyze campaign performance, surface conversion anomalies, and get data-driven recommendations.
            </p>

            {aiInsight ? (
              <div className="bg-deep-space/60 rounded-xl p-4 text-[13px] text-txt-secondary whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-border-subtle/50">
                {aiInsight}
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center rounded-xl text-sm text-txt-secondary border border-dashed border-border-subtle">
                Click generate to run store audit
              </div>
            )}
          </div>

          <button
            onClick={generateStoreInsights}
            disabled={loadingInsight}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 accent-gradient text-txt-primary font-medium py-3 px-4 rounded-xl shadow-glow-accent/30 hover:shadow-glow-accent disabled:opacity-50 transition-all duration-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {loadingInsight ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Audit Insights</span>
              </>
            )}
          </button>
        </motion.div>
      </motion.div>

      {/* Recent Campaigns Table */}
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="card p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold text-txt-primary">Recent Campaigns</h2>
          <button 
            onClick={() => setPage('monitor')}
            className="text-[13px] font-medium text-accent-light hover:text-txt-primary flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl px-2 py-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-4 px-4 bg-elevated/20 rounded-xl border border-border-subtle/50 animate-pulse">
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-1/4" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-12" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-16" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-16" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-24" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-12 ml-auto" />
              </div>
            ))}
          </div>
        ) : recentCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border-subtle text-txt-secondary font-medium">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border-subtle/50 hover:bg-elevated/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-txt-primary">{c.name}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-3 py-1 rounded-xl text-[11px] font-medium bg-elevated text-txt-secondary border border-border-subtle/50">
                        {c.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-txt-secondary">{c.audience_size.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-xl text-[11px] font-medium ${
                        c.status === 'completed' ? 'status-success' :
                        c.status === 'running' ? 'status-active animate-pulse' :
                        c.status === 'failed' ? 'status-danger' :
                        'bg-elevated text-txt-secondary'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-txt-secondary">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {c.status !== 'draft' ? (
                          <button 
                            onClick={() => {
                              setCampaignId(c.id);
                              setPage('monitor');
                            }}
                            className="text-[12px] font-medium text-accent-light hover:text-txt-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl px-2 py-1"
                          >
                            Monitor →
                          </button>
                        ) : (
                          <span className="text-[12px] text-txt-secondary">—</span>
                        )}
                        <button 
                          onClick={() => handleDeleteCampaign(c.id)}
                          className="text-[12px] font-medium text-txt-secondary hover:text-rose-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl px-2 py-1"
                          title="Delete Campaign"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-elevated border border-border-subtle flex items-center justify-center text-txt-secondary mb-4 animate-pulse">
              <Radio className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-base font-display font-bold text-txt-primary">No Campaigns Active</h3>
            <p className="text-sm text-txt-secondary mt-1 max-w-xs">You haven't launched any marketing campaigns yet. Describe your goals to the AI Builder to start.</p>
            <button 
              onClick={() => setPage('builder')}
              className="mt-4 text-xs font-semibold text-txt-primary bg-accent hover:bg-accent-light transition-all duration-150 px-4 py-2.5 rounded-xl shadow-glow-accent/20 hover:shadow-glow-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Build your first campaign
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
