import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import TicketPassCard from '../components/TicketPassCard';
import {
  Ticket,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'valid' | 'checked_in'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [copiedPayloadId, setCopiedPayloadId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tickets/my-tickets');
      setTickets(res.data);
      if (res.data.length > 0) {
        setSelectedTicket(res.data[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load your wallet passes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicket = async (ticket) => {
    if (!window.confirm(`Cancel ticket ${ticket.ticketNumber}? This cannot be undone.`)) return;
    try {
      setCancellingId(ticket._id);
      await api.put(`/tickets/${ticket._id}/cancel`);
      const updated = tickets.map((t) => (t._id === ticket._id ? { ...t, status: 'cancelled' } : t));
      setTickets(updated);
      setSelectedTicket((cur) => (cur && cur._id === ticket._id ? { ...cur, status: 'cancelled' } : cur));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel ticket.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCopyPayload = (ticket) => {
    const payload = ticket.qrPayload || JSON.stringify({
      t: ticket._id,
      e: ticket.event?._id || ticket.event,
      s: ticket.qrSignature,
    });

    navigator.clipboard.writeText(payload);
    setCopiedPayloadId(ticket._id);
    setTimeout(() => setCopiedPayloadId(null), 2500);
  };

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'valid') return t.status === 'valid';
    if (filter === 'checked_in') return t.status === 'checked_in';
    if (filter === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Ticket className="w-3.5 h-3.5" />
            Personal Pass Wallet
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            My Digital Passes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-proof digital credentials verified with cryptographic HMAC-SHA256 signatures.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setFilter('valid')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'valid'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Valid ({tickets.filter((t) => t.status === 'valid').length})
          </button>
          <button
            onClick={() => setFilter('checked_in')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'checked_in'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Used ({tickets.filter((t) => t.status === 'checked_in').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'cancelled'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cancelled ({tickets.filter((t) => t.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading your cryptographically signed passes...</p>
        </div>
      ) : error ? (
        <div className="p-8 glass-panel rounded-3xl border border-red-500/20 text-center max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium text-sm mb-4">{error}</p>
          <button
            onClick={fetchMyTickets}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 max-w-lg mx-auto p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Passes In Your Wallet</h3>
          <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto">
            You haven't reserved tickets for any upcoming events yet. Discover summits and festivals today.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Tickets Roster */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Pass to Preview
            </h3>

            {filteredTickets.length === 0 && (
              <p className="text-xs text-slate-500 py-6 text-center glass-panel rounded-2xl border border-slate-800">
                No passes in this category.
              </p>
            )}

            {filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?._id === ticket._id;
              const eventDate = ticket.event?.date ? new Date(ticket.event.date) : new Date();

              return (
                <div
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 shadow-glow-primary'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {ticket.ticketNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            ticket.status === 'valid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ticket.status === 'checked_in'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {ticket.status === 'valid' ? 'Valid' : ticket.status === 'checked_in' ? 'Checked In' : 'Cancelled'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white line-clamp-1">
                        {ticket.event?.title || 'Unknown Event'}
                      </h4>

                      <div className="mt-2 space-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            {eventDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span className="truncate max-w-[200px]">
                            {ticket.event?.venue}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-300">
                        {ticket.tierName}
                      </span>
                      <span className="mt-3 text-sm font-extrabold text-white">
                        ${ticket.pricePaid}
                      </span>
                    </div>
                  </div>

                  {ticket.status === 'valid' && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={cancellingId === ticket._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelTicket(ticket);
                        }}
                        className="text-[11px] font-semibold text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {cancellingId === ticket._id ? 'Cancelling...' : 'Cancel Ticket'}
                      </button>
                    </div>
                  )}

                  {/* Copy QR Payload button for quick testing */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono">
                      HMAC: {ticket.qrSignature?.substring(0, 8)}...
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPayload(ticket);
                      }}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                      title="Copy QR payload for scanner verification"
                    >
                      {copiedPayloadId === ticket._id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Payload Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy QR Payload
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Interactive Digital Pass Card Preview */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-md">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center lg:text-left">
                Active Pass View
              </h3>
              {selectedTicket ? (
                <TicketPassCard ticket={selectedTicket} />
              ) : (
                <div className="p-12 text-center text-slate-500 glass-panel rounded-3xl">
                  Select a pass from the list to preview the high-contrast QR code.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
