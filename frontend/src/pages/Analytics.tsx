import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sparkles, BarChart3, TrendingUp, HelpCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface Campaign {
  id: number;
  name: string;
  channel: string;
  audience_size: number;
  status: string;
  created_at: string;
}

interface AnalyticsDataItem {
  name: string;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

export default function Analytics() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | number>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/analytics`);
      const data = await res.json();
      setAnalyticsData(data);
      
      const campRes = await fetch(`${API_URL}/api/campaigns`);
      const campData = await campRes.json();
      const filteredCamps = campData.filter((c: Campaign) => c.status !== 'draft');
      setCampaigns(filteredCamps);
      
      if (filteredCamps.length > 0) {
        setSelectedCampaignId(filteredCamps[0].id);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const explainPerformance = async () => {
    if (!selectedCampaignId) return;
    setLoadingAI(true);
    setAiSummary('');
    setAiRecommendations([]);
    
    try {
      const res = await fetch(`${API_URL}/api/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: parseInt(selectedCampaignId.toString()) })
      });
      const data = await res.json();
      setAiSummary(data.summary);
      setAiRecommendations(data.recommendations);
    } catch (err) {
      console.error('Failed to get AI insights:', err);
      setAiSummary('Failed to connect to AI performance explainer. Make sure backend servers are running.');
    } finally {
      setLoadingAI(false);
    }
  };

  const tooltipStyle = {
    backgroundColor: 'var(--tooltip-bg)',
    border: '1px solid var(--tooltip-border)',
    borderRadius: '12px',
    color: 'var(--tooltip-text)',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  };

  return (
    <motion.div 
      className="space-y-8 max-w-5xl"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-display font-bold tracking-tight text-txt-primary">Analytics Overview</h1>
        <p className="text-sm text-txt-secondary mt-1">Cross-campaign engagement performance metrics and AI conversion analysis.</p>
      </motion.div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6 h-80 bg-[var(--skeleton-bg)] rounded-xl animate-pulse" />
          <div className="card p-6 h-80 bg-[var(--skeleton-bg)] rounded-xl animate-pulse" />
        </div>
      ) : analyticsData.length > 0 ? (
        <motion.div variants={stagger} className="space-y-6">
          {/* Charts Row */}
          <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-2">
            {/* Chart 1 */}
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-display font-bold text-txt-primary flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent-light" />
                <span>Open vs Click-Through Rates</span>
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="open_rate" name="Open Rate (%)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="click_rate" name="Click Rate (%)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-display font-bold text-txt-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent-light" />
                <span>Purchase Conversion Rates</span>
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Line type="monotone" dataKey="conversion_rate" name="Conversion Rate (%)" stroke="#10B981" strokeWidth={2.5} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* AI Explainer Area */}
          <motion.div variants={fadeUp} className="card p-6 relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 p-12 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-subtle pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-accent-muted">
                  <Sparkles className="w-4 h-4 text-accent-light" />
                </div>
                <h2 className="text-xl font-display font-bold text-txt-primary">AI Performance Explainer</h2>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="flex-grow sm:flex-grow-0 bg-[var(--input-bg)] border border-[var(--input-border)] text-txt-primary rounded-xl py-2 px-4 text-[12px] outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                >
                  <option value="" disabled className="bg-[var(--option-bg)]">Select Campaign to Analyze</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[var(--option-bg)]">
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={explainPerformance}
                  disabled={loadingAI || !selectedCampaignId}
                  className="inline-flex items-center justify-center gap-2 accent-gradient text-txt-primary font-medium py-2.5 px-4 rounded-xl text-[12px] shadow-glow-accent/30 hover:shadow-glow-accent disabled:opacity-50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {loadingAI ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Analyze</span>
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loadingAI ? (
                <motion.div key="loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="grid gap-6 md:grid-cols-3 animate-pulse mt-4">
                  <div className="md:col-span-2 space-y-3">
                    <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-24" />
                    <div className="h-48 bg-[var(--skeleton-bg)] rounded-xl w-full" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-24" />
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-[var(--skeleton-bg)] rounded-xl w-full" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : aiSummary ? (
                <motion.div key="content" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="grid gap-6 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-3">
                    <h4 className="text-xs font-display font-bold text-txt-secondary uppercase tracking-wider">Performance Audit</h4>
                    <div className="bg-deep-space border border-border-subtle p-5 rounded-xl text-txt-secondary text-[13px] leading-relaxed whitespace-pre-wrap">
                      {aiSummary}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-display font-bold text-txt-secondary uppercase tracking-wider">Recommendations</h4>
                    <div className="space-y-2">
                      {aiRecommendations.map((r, idx) => (
                        <div key={idx} className="flex gap-2.5 bg-elevated/40 border border-border-subtle p-4 rounded-xl text-[12px] text-txt-secondary">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} className="py-12 flex flex-col items-center justify-center border border-dashed border-border-subtle rounded-xl text-txt-secondary text-center px-4">
                  <HelpCircle className="w-8 h-8 text-accent mb-3 animate-pulse" />
                  <h3 className="text-base font-display font-bold text-txt-primary">AI Explainer Idle</h3>
                  <p className="text-sm text-txt-secondary mt-1 max-w-sm">Want to know why a campaign converted well or poorly? Select a launched campaign above and click analyze to trigger AI diagnostics.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border-subtle rounded-xl text-txt-secondary text-center px-4 m-4">
          <TrendingUp className="w-8 h-8 text-accent opacity-50 mb-3 animate-pulse" />
          <h3 className="text-base font-display font-bold text-txt-primary">No Campaign Analytics</h3>
          <p className="text-sm text-txt-secondary mt-1 max-w-xs">Please launch at least one campaign to populate performance charts and unlock AI diagnostic reviews.</p>
        </div>
      )}
    </motion.div>
  );
}
