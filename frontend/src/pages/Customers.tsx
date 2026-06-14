import React, { useState, useEffect } from 'react';
import { Search, Upload, User, Calendar, CreditCard, ChevronLeft, ChevronRight, X, Mic, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useVoiceInput from '../hooks/useVoiceInput';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  total_spend: number;
  last_purchase_date?: string;
}

interface Order {
  id: number;
  amount: number;
  order_date: string;
}

interface CustomerDetail extends Customer {
  orders: Order[];
}

interface UploadMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [limit] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<UploadMessage | null>(null);
  
  // Single customer details modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const { isRecording, isTranscribing, transcript: voiceTranscript, error: voiceError, startRecording, stopRecording, setTranscript: setVoiceTranscript } = useVoiceInput();

  useEffect(() => {
    if (voiceTranscript) {
      setSearch(voiceTranscript);
      setPage(1);
      setVoiceTranscript('');
    }
  }, [voiceTranscript, setVoiceTranscript]);

  const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customers?page=${page}&limit=${limit}&search=${search}`);
      const data = await res.json();
      setCustomers(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (id: number) => {
    setLoadingDetails(true);
    setSelectedCustomerId(id);
    try {
      const res = await fetch(`${API_URL}/api/customers/${id}`);
      const data = await res.json();
      setCustomerDetails(data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadMessage({ type: 'info', text: 'Processing CSV file upload...' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_URL}/api/customers/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.status === 200) {
        setUploadMessage({ type: 'success', text: `Import completed! Loaded ${data.imported} customers. Skipped ${data.skipped_duplicates} duplicates.` });
        fetchCustomers();
      } else {
        setUploadMessage({ type: 'error', text: data.detail || 'Failed to process CSV file.' });
      }
    } catch (err) {
      console.error('Error uploading CSV:', err);
      setUploadMessage({ type: 'error', text: 'Connection failed. Ensure backend is running.' });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMessage(null), 6000);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div 
      className="space-y-6 relative"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-txt-primary">Customers</h1>
          <p className="text-sm text-txt-secondary mt-1">Manage shopper profiles and import datasets.</p>
        </div>

        {/* Upload Button */}
        <label className="cursor-pointer inline-flex items-center gap-2 bg-elevated border border-border-subtle hover:border-txt-secondary/30 text-txt-secondary font-medium py-2 px-4 rounded-xl shadow transition-colors text-sm focus-within:ring-2 focus-within:ring-accent">
          <Upload className="w-4 h-4 text-txt-secondary" />
          <span>{uploading ? 'Importing...' : 'Upload CSV'}</span>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            onChange={handleCSVUpload} 
            disabled={uploading}
          />
        </label>
      </motion.div>

      {/* Upload Toast/Alert */}
      <AnimatePresence>
        {uploadMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border text-[13px] flex items-center justify-between ${
              uploadMessage.type === 'success' ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' :
              uploadMessage.type === 'error' ? 'bg-rose-400/10 border-rose-400/20 text-rose-400' :
              'bg-accent-muted border-accent/20 text-accent-light animate-pulse'
            }`}
          >
            <span>{uploadMessage.text}</span>
            <button onClick={() => setUploadMessage(null)} className="hover:opacity-75 focus:outline-none">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Section */}
      <motion.div variants={fadeUp}>
        <div className="card p-3 rounded-xl flex items-center gap-3 focus-within:ring-2 focus-within:ring-accent transition-all duration-150">
          <Search className="w-4 h-4 text-txt-secondary ml-2" />
          <input 
            type="text" 
            value={search}
            onChange={handleSearchChange}
            placeholder="Search customers by name, email, or phone..." 
            className="bg-transparent border-none outline-none text-txt-primary w-full text-[13px] placeholder-txt-secondary/50"
          />
          <div className="relative">
            {isRecording && <div className="absolute inset-0 bg-rose-500/30 rounded-full animate-ping" />}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`relative p-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isRecording 
                  ? 'bg-rose-500 text-txt-primary shadow-[0_0_15px_rgba(244,63,94,0.5)]' 
                  : isTranscribing
                    ? 'bg-elevated text-accent cursor-not-allowed'
                    : 'bg-elevated border border-border-subtle text-txt-secondary hover:text-txt-primary hover:bg-border-subtle'
              }`}
              title={isRecording ? "Stop recording" : "Voice search"}
            >
              {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        {voiceError && <p className="text-xs text-rose-400 mt-2 ml-2">{voiceError}</p>}
      </motion.div>

      {/* Customer List Card */}
      <motion.div variants={fadeUp} className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-6 items-center py-4 px-6 bg-elevated/20 rounded-xl border border-border-subtle/50 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[var(--skeleton-bg)] flex-shrink-0" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-1/4" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-1/3" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-20" />
                <div className="h-4 bg-[var(--skeleton-bg)] rounded-xl w-24" />
              </div>
            ))}
          </div>
        ) : customers.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-txt-secondary font-medium">
                    <th className="py-3 px-6">Name</th>
                    <th className="py-3 px-6">Email</th>
                    <th className="py-3 px-6">Phone</th>
                    <th className="py-3 px-6">Total Spend</th>
                    <th className="py-3 px-6">Last Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => fetchCustomerDetails(c.id)}
                      className="border-b border-border-subtle/50 hover:bg-elevated/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-6 font-medium text-txt-primary flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-elevated flex items-center justify-center border border-border-subtle text-[11px] text-txt-secondary">
                          {c.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{c.name}</span>
                      </td>
                      <td className="py-3 px-6 text-txt-secondary">{c.email}</td>
                      <td className="py-3 px-6 text-txt-secondary">{c.phone || '-'}</td>
                      <td className="py-3 px-6 font-medium text-txt-primary">
                        ₹{c.total_spend ? c.total_spend.toLocaleString('en-IN') : '0.00'}
                      </td>
                      <td className="py-3 px-6 text-txt-secondary">
                        {c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-6 py-3 border-t border-border-subtle/80">
                <span className="text-[12px] text-txt-secondary">
                  Showing Page {page} of {totalPages} ({total} customers total)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 border border-border-subtle rounded-xl bg-elevated text-txt-secondary disabled:opacity-40 hover:bg-border-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-1.5 border border-border-subtle rounded-xl bg-elevated text-txt-secondary disabled:opacity-40 hover:bg-border-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-elevated border border-border-subtle flex items-center justify-center text-txt-secondary mb-4 animate-pulse">
              <User className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-base font-display font-bold text-txt-primary">No Shoppers Found</h3>
            <p className="text-sm text-txt-secondary mt-1 max-w-xs">We couldn't find any customers matching "{search}". Try adjusting your query or upload a new CSV dataset.</p>
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="mt-4 text-xs font-semibold text-txt-primary bg-accent hover:bg-accent-light transition-all duration-150 px-4 py-2.5 rounded-xl shadow-glow-accent/20 hover:shadow-glow-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Customer slide-out details panel */}
      <AnimatePresence>
        {selectedCustomerId && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-deep-space/80 backdrop-blur-sm"
              onClick={() => setSelectedCustomerId(null)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-surface border-l border-border-subtle h-full p-6 shadow-2xl flex flex-col justify-between relative z-10"
            >
              <div>
                <div className="flex justify-between items-center border-b border-border-subtle pb-4 mb-6">
                  <h2 className="text-xl font-display font-bold text-txt-primary">Customer Profile</h2>
                  <button 
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setCustomerDetails(null);
                    }}
                    className="p-1.5 rounded-xl hover:bg-elevated text-txt-secondary hover:text-txt-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="space-y-6 animate-pulse mt-4">
                    <div className="flex items-center gap-4 bg-elevated/40 p-4 border border-border-subtle rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-white/5" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-white/5 rounded-xl w-2/3" />
                        <div className="h-3 bg-white/5 rounded-xl w-1/2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-elevated/30 border border-border-subtle p-4 rounded-xl h-20" />
                      <div className="bg-elevated/30 border border-border-subtle p-4 rounded-xl h-20" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 bg-white/5 rounded-xl w-1/3" />
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-12 bg-white/5 rounded-xl" />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : customerDetails ? (
                  <div className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-4 bg-elevated/40 p-4 border border-border-subtle rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center border border-accent/30 text-lg font-bold text-accent-light">
                        {customerDetails.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-lg font-display font-bold text-txt-primary leading-tight">{customerDetails.name}</h3>
                        <p className="text-[13px] text-txt-secondary mt-0.5">{customerDetails.email}</p>
                        <p className="text-[11px] text-txt-secondary mt-0.5">{customerDetails.phone || 'No phone number'}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-elevated/30 border border-border-subtle p-4 rounded-xl">
                        <div className="flex items-center gap-1.5 text-txt-secondary text-[11px] font-medium uppercase tracking-wide">
                          <CreditCard className="w-3.5 h-3.5 text-accent" />
                          <span>Total Spend</span>
                        </div>
                        <p className="text-lg font-display font-bold text-txt-primary mt-1">₹{customerDetails.total_spend.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-elevated/30 border border-border-subtle p-4 rounded-xl">
                        <div className="flex items-center gap-1.5 text-txt-secondary text-[11px] font-medium uppercase tracking-wide">
                          <Calendar className="w-3.5 h-3.5 text-accent" />
                          <span>Last Order</span>
                        </div>
                        <p className="text-[13px] font-medium text-txt-primary mt-2">
                          {customerDetails.last_purchase_date ? new Date(customerDetails.last_purchase_date).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Order History */}
                    <div>
                      <h4 className="text-xs font-display font-bold text-txt-secondary uppercase tracking-wider mb-3">Order History ({customerDetails.orders.length})</h4>
                      {customerDetails.orders.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {customerDetails.orders.map((o) => (
                            <div key={o.id} className="flex justify-between items-center bg-elevated/20 border border-border-subtle/50 p-3 rounded-xl hover:bg-elevated/40 transition-colors">
                              <div>
                                <p className="text-[13px] font-medium text-txt-primary">Order #{o.id}</p>
                                <p className="text-[11px] text-txt-secondary mt-0.5">{new Date(o.order_date).toLocaleDateString()}</p>
                              </div>
                              <span className="text-[13px] font-bold text-txt-primary">₹{o.amount.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-txt-secondary border border-dashed border-border-subtle p-6 rounded-xl text-center">
                          This customer has no recorded orders.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetails(null);
                }}
                className="w-full bg-elevated border border-border-subtle hover:bg-border-subtle hover:text-txt-primary text-txt-primary text-[13px] font-medium py-3 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Close Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
