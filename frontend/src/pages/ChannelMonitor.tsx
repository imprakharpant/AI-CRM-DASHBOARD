import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, Smartphone, Mail, MessageSquare, Send, CheckCircle, Flame, Gift, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface ChannelEvent {
  id: number;
  customer_name: string;
  campaign_name: string;
  channel: string;
  event_type: string;
  metadata?: any;
  timestamp: string;
}

export default function ChannelMonitor() {
  const [events, setEvents] = useState<ChannelEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [polling, setPolling] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [limit] = useState<number>(50);

  const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  useEffect(() => {
    fetchEvents();
  }, [page]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (polling) {
      intervalId = setInterval(() => {
        fetchEvents(true);
      }, 4000);
    }
    return () => clearInterval(intervalId);
  }, [polling, page, events.length]);

  const fetchEvents = async (isSilent = false) => {
    if (!isSilent && page === 1 && events.length === 0) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/events?page=${page}&limit=${limit}`);
      const data = await res.json();
      setEvents(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching callback events:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1.5 w-fit uppercase tracking-wider";
    switch(status.toLowerCase()) {
      case 'sent':
        return <span className={`${base} bg-elevated text-txt-secondary border border-border-subtle`}><Send className="w-3 h-3" /> Sent</span>;
      case 'delivered':
        return <span className={`${base} bg-accent-muted text-accent-light border border-accent/20`}><Smartphone className="w-3 h-3" /> Delivered</span>;
      case 'opened':
        return <span className={`${base} bg-[#C084FC]/10 text-[#C084FC] border border-[#C084FC]/20`}><MessageSquare className="w-3 h-3" /> Opened</span>;
      case 'read':
        return <span className={`${base} bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20`}><CheckCircle className="w-3 h-3" /> Read</span>;
      case 'clicked':
        return <span className={`${base} bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20`}><Flame className="w-3 h-3" /> Clicked</span>;
      case 'conversion':
        return <span className={`${base} bg-emerald-400/10 text-emerald-400 border border-emerald-400/20`}><Gift className="w-3 h-3 animate-bounce" /> Converted</span>;
      case 'failed':
        return <span className={`${base} bg-rose-400/10 text-rose-400 border border-rose-400/20`}><AlertCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className={`${base} bg-elevated text-txt-secondary border border-border-subtle`}>{status}</span>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-txt-secondary" />;
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'sms':
        return <Send className="w-3.5 h-3.5 text-sky-500" />;
      case 'rcs':
        return <Radio className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Smartphone className="w-3.5 h-3.5 text-txt-secondary" />;
    }
  };

  return (
    <motion.div 
      className="space-y-8 max-w-5xl"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-txt-primary">Channel Monitor</h1>
          <p className="text-sm text-txt-secondary mt-1">Live table feed showing simulator callbacks and receipt hooks from messages.</p>
        </div>

        {/* Polling Switch & Manual Sync */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-[12px] font-medium text-txt-secondary">
            <input 
              type="checkbox" 
              checked={polling} 
              onChange={(e) => setPolling(e.target.checked)}
              className="rounded-xl border-border-subtle bg-deep-space text-accent focus:ring-accent w-3.5 h-3.5 focus:outline-none focus:ring-2"
            />
            <span className="uppercase tracking-wide">Auto Sync Feed</span>
          </label>

          <button
            onClick={() => fetchEvents()}
            className="inline-flex items-center gap-1.5 bg-elevated border border-border-subtle hover:bg-border-subtle text-txt-secondary font-medium py-2 px-4 rounded-xl text-[12px] shadow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Feed</span>
          </button>
        </div>
      </motion.div>

      {/* Live Event Feed Container */}
      <motion.div variants={fadeUp} className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-6 items-center py-4 px-6 bg-elevated/20 rounded-xl border border-border-subtle/50 animate-pulse">
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-1/5" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-1/4" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-16" />
                <div className="h-6 bg-[var(--skeleton-bg)] rounded-xl w-20" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-1/4" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-txt-secondary font-medium">
                    <th className="py-3 px-6">Customer</th>
                    <th className="py-3 px-6">Campaign</th>
                    <th className="py-3 px-6">Channel</th>
                    <th className="py-3 px-6">Callback Status</th>
                    <th className="py-3 px-6">Details</th>
                    <th className="py-3 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {events.map((e) => (
                      <motion.tr 
                        key={e.id} 
                        layout
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 320, 
                          damping: 30,
                          layout: { type: 'spring', stiffness: 320, damping: 30 }
                        }}
                        className="border-b border-border-subtle/50 hover:bg-elevated/30 transition-colors"
                      >
                        <td className="py-3 px-6 font-medium text-txt-primary">{e.customer_name}</td>
                        <td className="py-3 px-6 text-txt-secondary">{e.campaign_name}</td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2 text-txt-secondary capitalize text-[12px] font-medium">
                            {getChannelIcon(e.channel)}
                            <span>{e.channel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          {getStatusBadge(e.event_type)}
                        </td>
                        <td className="py-3 px-6 text-[12px] text-txt-secondary">
                          {e.metadata ? (
                            e.event_type.toLowerCase() === 'conversion' ? (
                              <span className="text-emerald-400 font-medium bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-xl">
                                Sale: ₹{parseFloat(e.metadata.amount).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              JSON.stringify(e.metadata)
                            )
                          ) : '-'}
                        </td>
                        <td className="py-3 px-6 text-txt-secondary text-[12px]">
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination details for Events */}
            {total > limit && (
              <div className="flex justify-between items-center px-6 py-3 border-t border-border-subtle/80">
                <span className="text-[12px] text-txt-secondary font-medium">
                  Total events logged: {total} (Showing latest first)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="py-1 px-3.5 border border-border-subtle rounded-xl bg-elevated text-[11px] font-medium uppercase tracking-wide text-txt-secondary disabled:opacity-40 hover:bg-border-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Previous
                  </button>
                  <button
                    disabled={events.length < limit}
                    onClick={() => setPage(prev => prev + 1)}
                    className="py-1 px-3.5 border border-border-subtle rounded-xl bg-elevated text-[11px] font-medium uppercase tracking-wide text-txt-secondary disabled:opacity-40 hover:bg-border-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-elevated border border-border-subtle flex items-center justify-center text-txt-secondary mb-4 animate-pulse">
              <Smartphone className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-base font-display font-bold text-txt-primary">No Callback Events</h3>
            <p className="text-sm text-txt-secondary mt-1 max-w-xs">No simulation events have been processed yet. Webhook callbacks will stream here once a campaign is launched.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
