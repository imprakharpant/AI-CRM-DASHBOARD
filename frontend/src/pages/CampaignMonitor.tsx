import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, Send, Mail, MessageSquare, IndianRupee, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Counter from '../components/Counter';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface CampaignMetrics {
  sent: number;
  delivered: number;
  opened: number;
  read: number;
  clicked: number;
  failed: number;
  conversions: number;
  revenue: number;
}

interface Campaign {
  id: number;
  name: string;
  channel: string;
  goal: string;
  message: string;
  audience_size: number;
  status: string;
  created_at: string;
  metrics: CampaignMetrics;
}

interface CampaignMonitorProps {
  campaignId: number | null;
  setCampaignId: (id: number | null) => void;
}

export default function CampaignMonitor({ campaignId, setCampaignId }: CampaignMonitorProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [polling, setPolling] = useState<boolean>(false);

  const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails(campaignId);
    }
  }, [campaignId]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (campaign && campaign.status === 'running') {
      setPolling(true);
      const currentId = campaign.id;
      intervalId = setInterval(() => {
        fetchCampaignDetails(currentId, true);
      }, 4000);
    } else {
      setPolling(false);
    }
    return () => clearInterval(intervalId);
  }, [campaign?.id, campaign?.status]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_URL}/api/campaigns`);
      const data = await res.json();
      setCampaigns(data);
      if (data.length > 0 && !campaignId) {
        setCampaignId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching campaigns list:', err);
    }
  };

  const fetchCampaignDetails = async (id: number, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}`);
      const data = await res.json();
      setCampaign(data);
    } catch (err) {
      console.error('Error fetching campaign detail:', err);
    } finally {
      if (!isSilent) setLoading(false);
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
        setCampaignId(null);
        setCampaign(null);
        fetchCampaigns();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete campaign");
      }
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert("Connection error when deleting campaign");
    }
  };

  const handleCampaignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    setCampaignId(id);
  };

  const calculateRates = () => {
    if (!campaign || !campaign.metrics) return { delivery: 0, open: 0, read: 0, click: 0, conversion: 0 };
    const m = campaign.metrics;
    
    return {
      delivery: m.sent > 0 ? Math.round((m.delivered / m.sent) * 100) : 0,
      open: m.delivered > 0 ? Math.round((m.opened / m.delivered) * 100) : 0,
      read: m.opened > 0 ? Math.round((m.read / m.opened) * 100) : 0,
      click: m.read > 0 ? Math.round((m.clicked / m.read) * 100) : 0,
      conversion: m.clicked > 0 ? Math.round((m.conversions / m.clicked) * 100) : 0,
    };
  };

  const rates = calculateRates();

  return (
    <motion.div 
      className="space-y-8 max-w-5xl"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-txt-primary">Campaign Monitor</h1>
          <p className="text-sm text-txt-secondary mt-1">Track dispatch delivery funnels and attributed order receipts in real-time.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <AnimatePresence>
            {polling && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-1.5 text-[11px] text-accent font-medium bg-accent-muted px-3 py-1.5 border border-accent/20 rounded-xl"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="uppercase tracking-wide">Syncing callbacks...</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <select
            value={campaignId || ''}
            onChange={handleCampaignChange}
            className="flex-grow sm:flex-grow-0 bg-[var(--input-bg)] border border-[var(--input-border)] text-txt-primary rounded-xl py-2 px-4 text-[13px] outline-none font-medium focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          >
            <option value="" disabled className="bg-[var(--option-bg)]">Select Campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id} className="bg-[var(--option-bg)]">
                {c.name} ({new Date(c.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>

          <button
            onClick={() => campaignId && fetchCampaignDetails(campaignId)}
            disabled={!campaignId}
            className="p-2 bg-elevated border border-border-subtle hover:border-txt-secondary text-txt-secondary hover:text-txt-primary rounded-xl transition-all duration-150 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => campaignId && handleDeleteCampaign(campaignId)}
            disabled={!campaignId}
            className="p-2 bg-elevated border border-border-subtle hover:border-rose-400 text-txt-secondary hover:text-rose-400 rounded-xl transition-all duration-150 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            title="Delete Campaign"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          {/* Overview Skeleton */}
          <div className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-3 flex-grow">
              <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-20" />
              <div className="h-6 bg-[var(--skeleton-bg)] rounded-xl w-1/3" />
              <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-2/3" />
            </div>
            <div className="bg-[var(--skeleton-bg)] rounded-xl h-16 w-32" />
          </div>
          {/* Metrics Grid Skeleton */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="card p-4 h-20 bg-[var(--skeleton-bg)] rounded-xl" />
            ))}
          </div>
          {/* Funnel Skeleton */}
          <div className="card p-6 h-64 bg-[var(--skeleton-bg)] rounded-xl" />
        </div>
      ) : campaign ? (
        <motion.div variants={stagger} className="space-y-6">
          {/* Overview */}
          <motion.div variants={fadeUp} className="card p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-xl text-[11px] font-medium ${
                  campaign.status === 'completed' ? 'status-success' :
                  campaign.status === 'running' ? 'status-active animate-pulse' :
                  campaign.status === 'failed' ? 'status-danger' :
                  'bg-elevated text-txt-secondary border border-border-subtle/50'
                }`}>
                  {campaign.status}
                </span>
                
                <span className="capitalize text-txt-secondary text-[13px] font-medium flex items-center gap-1.5">
                  {campaign.channel === 'email' && <Mail className="w-3.5 h-3.5 text-accent" />}
                  {campaign.channel === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />}
                  {campaign.channel === 'sms' && <Send className="w-3.5 h-3.5 text-sky-500" />}
                  {campaign.channel === 'rcs' && <Radio className="w-3.5 h-3.5 text-purple-500" />}
                  <span>{campaign.channel}</span>
                </span>
              </div>
              
              <h2 className="text-xl font-display font-bold text-txt-primary mt-2">{campaign.name}</h2>
              <p className="text-[13px] text-txt-secondary mt-1 leading-relaxed max-w-xl">
                Goal: <span className="text-txt-secondary italic">"{campaign.goal || 'No specified goal'}"</span>
              </p>
            </div>

            <div className="bg-elevated/40 border border-border-subtle p-4 rounded-xl text-center min-w-[170px]">
              <span className="text-[11px] text-txt-secondary font-medium uppercase tracking-wide block">Audience Size</span>
              <span className="text-2xl font-display font-bold text-txt-primary mt-1 flex items-center justify-center font-mono">
                <Counter 
                  value={campaign.audience_size} 
                  fontSize={24} 
                  fontWeight={700} 
                  padding={0} 
                  gap={0.5} 
                  horizontalPadding={0} 
                  gradientHeight={0}
                />
              </span>
              <div className="w-full bg-deep-space h-1.5 rounded-full overflow-hidden border border-border-subtle/50 mt-2.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${campaign.audience_size > 0 ? Math.round((campaign.metrics.sent / campaign.audience_size) * 100) : 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-accent h-full rounded-full" 
                />
              </div>
              <span className="text-[10px] text-txt-secondary block mt-2 font-mono">
                {campaign.metrics.sent} / {campaign.audience_size} sent
                {campaign.audience_size - campaign.metrics.sent > 0 ? (
                  ` (${campaign.audience_size - campaign.metrics.sent} left)`
                ) : (
                  ' (Done)'
                )}
              </span>
            </div>
          </motion.div>

          {/* Metrics Grid */}
          <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {[
              { label: 'Dispatched', value: campaign.metrics.sent, color: 'text-txt-secondary' },
              { label: 'Delivered', value: campaign.metrics.delivered, color: 'text-accent-light' },
              { label: 'Opened', value: campaign.metrics.opened, color: 'text-[#C084FC]' },
              { label: 'Read', value: campaign.metrics.read, color: 'text-[#A78BFA]' },
              { label: 'Clicked', value: campaign.metrics.clicked, color: 'text-[#38BDF8]' },
              { label: 'Failed', value: campaign.metrics.failed, color: 'text-rose-400' },
              { label: 'Orders', value: campaign.metrics.conversions, color: 'text-emerald-400', special: true }
            ].map((m, idx) => (
              <div key={idx} className={`card p-4 text-center transition-all duration-150 ${m.special ? 'border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : ''}`}>
                <span className="text-[10px] text-txt-secondary font-medium uppercase tracking-wider block">{m.label}</span>
                <span className={`text-lg font-display font-bold ${m.color} mt-1.5 flex items-center justify-center font-mono`}>
                  <Counter 
                    value={m.value} 
                    fontSize={18} 
                    fontWeight={700} 
                    textColor="inherit" 
                    padding={0} 
                    gap={0.3} 
                    horizontalPadding={0} 
                    gradientHeight={0}
                  />
                </span>
              </div>
            ))}
          </motion.div>

          {/* Conversion Details */}
          <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-3">
            <div className="card p-6 md:col-span-1 flex items-center justify-between border border-warm/10 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
              <div>
                <span className="text-[11px] text-txt-secondary font-medium uppercase tracking-wider">Campaign Revenue</span>
                <div className="text-2xl font-display font-bold text-warm mt-1 flex items-center font-mono">
                  <span className="mr-0.5 select-none text-warm">₹</span>
                  <Counter 
                    value={campaign.metrics.revenue} 
                    fontSize={24} 
                    fontWeight={700} 
                    padding={0} 
                    gap={0.5} 
                    horizontalPadding={0} 
                    gradientHeight={0}
                  />
                </div>
                <span className="text-[11px] text-txt-secondary block mt-1">Attributed order conversions</span>
              </div>
              <div className="p-3 bg-warm-muted rounded-xl">
                <IndianRupee className="w-5 h-5 text-warm" />
              </div>
            </div>

            <div className="card p-6 md:col-span-2 space-y-3">
              <span className="text-[11px] text-txt-secondary font-medium uppercase tracking-wider block">Message Copy Sent</span>
              <div className="bg-deep-space border border-border-subtle p-4 rounded-xl text-[13px] text-txt-secondary italic leading-relaxed whitespace-pre-wrap">
                {campaign.message}
              </div>
            </div>
          </motion.div>

          {/* Funnel */}
          <motion.div variants={fadeUp} className="card p-6 space-y-6">
            <h3 className="text-base font-display font-bold text-txt-primary uppercase tracking-wider">Campaign Delivery Funnel</h3>
            
            <div className="space-y-4">
              {[
                { title: 'Delivery Rate', rate: rates.delivery, val: campaign.metrics.delivered, total: campaign.metrics.sent, label: 'Delivered of Sent', color: 'bg-accent' },
                { title: 'Open Rate', rate: rates.open, val: campaign.metrics.opened, total: campaign.metrics.delivered, label: 'Opened of Delivered', color: 'bg-[#8B5CF6]' },
                { title: 'Read Rate', rate: rates.read, val: campaign.metrics.read, total: campaign.metrics.opened, label: 'Read of Opened', color: 'bg-[#6D28D9]' },
                { title: 'Click-Through Rate', rate: rates.click, val: campaign.metrics.clicked, total: campaign.metrics.read, label: 'Clicked of Read', color: 'bg-[#0EA5E9]' },
                { title: 'Conversion Rate', rate: rates.conversion, val: campaign.metrics.conversions, total: campaign.metrics.clicked, label: 'Purchased of Clicked', color: 'bg-emerald-500' }
              ].map((f, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-[12px]">
                    <div className="font-medium text-txt-secondary flex items-center gap-2">
                      <span className="text-txt-secondary font-mono text-[10px] bg-elevated w-4 h-4 rounded-full flex items-center justify-center border border-border-subtle">{idx+1}</span>
                      <span>{f.title}</span>
                    </div>
                    <span className="text-txt-secondary font-medium">{f.rate}% <span className="text-txt-secondary font-normal ml-1">({f.val.toLocaleString()} / {f.total.toLocaleString()} {f.label})</span></span>
                  </div>
                  <div className="w-full bg-deep-space h-2 rounded-full overflow-hidden border border-border-subtle">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${f.rate}%` }}
                      transition={{ duration: 1, delay: 0.2 + (idx * 0.1), ease: "easeOut" }}
                      className={`${f.color} h-full rounded-full`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-border-subtle rounded-xl m-4">
          <div className="w-12 h-12 rounded-xl bg-elevated border border-border-subtle flex items-center justify-center text-txt-secondary mb-4 animate-pulse">
            <Radio className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-base font-display font-bold text-txt-primary">No Campaigns Monitored</h3>
          <p className="text-sm text-txt-secondary mt-1 max-w-xs">Select an active campaign from the dropdown menu above to track dispatch channels and simulated conversions.</p>
        </div>
      )}
    </motion.div>
  );
}
