import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  DollarSign,
  Ticket,
  Users,
  Calendar,
  Plus,
  ShieldCheck,
  TrendingUp,
  Loader2,
  AlertCircle,
  Eye,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create Event Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Attendee Roster Modal state
  const [rosterEvent, setRosterEvent] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // New Event form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    date: '',
    status: 'published',
    ticketTiers: [
      { name: 'General Admission', price: 99, capacity: 150 },
      { name: 'VIP Pass', price: 299, capacity: 50 },
    ],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events/organizer/my-events');
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load organizer dashboard analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleTierChange = (index, field, value) => {
    const updated = formData.ticketTiers.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    setFormData({ ...formData, ticketTiers: updated });
  };

  const addTier = () => {
    setFormData({
      ...formData,
      ticketTiers: [
        ...formData.ticketTiers,
        { name: 'Tier ' + (formData.ticketTiers.length + 1), price: 50, capacity: 100 },
      ],
    });
  };

  const removeTier = (index) => {
    if (formData.ticketTiers.length <= 1) return;
    const updated = formData.ticketTiers.filter((_, i) => i !== index);
    setFormData({ ...formData, ticketTiers: updated });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);

    const names = formData.ticketTiers.map((t) => t.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      setCreateError('Each admission tier needs a unique name.');
      return;
    }
    setCreateLoading(true);

    try {
      await api.post('/events', { ...formData, date: new Date(formData.date).toISOString() });
      setShowCreateModal(false);
      // Reset form
      setFormData({
        title: '',
        description: '',
        venue: '',
        bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        date: '',
        status: 'published',
        ticketTiers: [
          { name: 'General Admission', price: 99, capacity: 150 },
          { name: 'VIP Pass', price: 299, capacity: 50 },
        ],
      });
      fetchDashboardData();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Error creating event.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleViewRoster = async (event) => {
    setRosterEvent(event);
    setRosterLoading(true);
    try {
      const res = await api.get(`/events/${event._id}/attendees`);
      setRosterData(res.data);
    } catch (err) {
      console.error('Error loading roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Cancel this event? All outstanding tickets will be voided.')) {
      return;
    }

    try {
      await api.delete(`/events/${eventId}`);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel event');
    }
  };

  const handleStatusChange = async (eventId, status) => {
    try {
      await api.put(`/events/${eventId}`, { status });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update event status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-slate-400">Loading organizer metrics and event analytics...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalCheckedIn: 0,
    totalEvents: 0,
  };

  const overallAttendanceRate =
    metrics.totalTicketsSold > 0
      ? Math.round((metrics.totalCheckedIn / metrics.totalTicketsSold) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Organizer Command Center
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Organizer Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ticket sales monitoring, admission progress, and optical gate dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/scan-gate"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-glow-success"
          >
            <ShieldCheck className="w-4 h-4" />
            Open Gate Scanner
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {/* Total Revenue */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">
            ${metrics.totalRevenue.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-emerald-400 font-medium">Gross ticket sales</p>
        </div>

        {/* Tickets Sold */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tickets Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">
            {metrics.totalTicketsSold}
          </p>
          <p className="mt-1 text-[11px] text-indigo-400 font-medium">Issued passes</p>
        </div>

        {/* Checked In / Scanned */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Check-In Volume
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">
            {metrics.totalCheckedIn} / {metrics.totalTicketsSold}
          </p>
          <p className="mt-1 text-[11px] text-teal-400 font-medium">Admitted attendees</p>
        </div>

        {/* Attendance Rate */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Attendance Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">
            {overallAttendanceRate}%
          </p>
          <p className="mt-1 text-[11px] text-purple-400 font-medium">Live gate turnout</p>
        </div>
      </div>

      {/* Events Managed Table / Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">Events Roster & Gate Dispatch</h2>

        {data?.events?.length === 0 ? (
          <div className="p-10 glass-panel rounded-3xl border border-slate-800 text-center">
            <p className="text-slate-400 text-sm">You have not created any events yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.events?.map((event) => {
              const eventDate = new Date(event.date);
              const stats = event.stats || {
                totalSold: 0,
                checkedInCount: 0,
                totalRevenue: 0,
                totalCapacity: 0,
                attendanceRate: 0,
              };

              return (
                <div
                  key={event._id}
                  className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                >
                  {/* Event Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={event.bannerUrl}
                      alt={event.title}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-700/80 flex-shrink-0"
                    />
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                        {event.title}
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                            event.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : event.status === 'draft'
                              ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                              : event.status === 'cancelled'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {event.status}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>{eventDate.toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{event.venue}</span>
                      </p>

                      {/* Tier breakdowns */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.ticketTiers.map((tier) => (
                          <span
                            key={tier.name}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {tier.name}: {tier.sold}/{tier.capacity} sold (${tier.price})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Revenue Progress */}
                  <div className="w-full lg:w-72 flex-shrink-0">
                    <div className="flex justify-between text-xs text-slate-400 mb-1 font-medium">
                      <span>Gate Turnout</span>
                      <span className="text-white font-bold">
                        {stats.checkedInCount} / {stats.totalSold} ({stats.attendanceRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.attendanceRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                      <span>Capacity: {stats.totalSold}/{stats.totalCapacity}</span>
                      <span className="text-emerald-400 font-semibold font-mono">
                        ${stats.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    <button
                      onClick={() => handleViewRoster(event)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      title="View Attendee List"
                    >
                      <Eye className="w-4 h-4 text-indigo-400" />
                      Roster
                    </button>

                    <button
                      onClick={() => navigate(`/scan-gate?eventId=${event._id}`)}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all text-xs font-bold flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Scan Gate
                    </button>

                    {event.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(event._id, 'published')}
                        className="px-3.5 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all text-xs font-bold"
                      >
                        Publish
                      </button>
                    )}
                    {event.status === 'published' && (
                      <button
                        onClick={() => handleStatusChange(event._id, 'completed')}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all text-xs font-semibold"
                        title="Mark event as completed (closes sales)"
                      >
                        Complete
                      </button>
                    )}
                    {event.status !== 'cancelled' && (
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Cancel Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendee Roster Modal */}
      {rosterEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Attendee Roster</h3>
                <p className="text-xs text-slate-400">{rosterEvent.title}</p>
              </div>
              <button
                onClick={() => setRosterEvent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4 divide-y divide-slate-800/80">
              {rosterLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              ) : rosterData?.tickets?.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No tickets booked yet for this event.
                </p>
              ) : (
                rosterData?.tickets?.map((ticket) => (
                  <div key={ticket._id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{ticket.attendee?.name || 'Attendee'}</p>
                      <p className="text-slate-400 text-[11px]">{ticket.attendee?.email}</p>
                      <span className="font-mono text-[10px] text-indigo-400">{ticket.ticketNumber}</span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ticket.status === 'checked_in'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : ticket.status === 'valid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">{ticket.tierName}</p>
                      {ticket.checkedInAt && (
                        <p className="text-[10px] text-slate-500">
                          {new Date(ticket.checkedInAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setRosterEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-xl w-full my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h3 className="text-xl font-bold text-white">Create New Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Distributed Systems Summit 2026"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event keynote, schedule, and guest speakers..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Venue
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Grand Arena, San Francisco"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={formData.bannerUrl}
                  onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Visibility
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="published">Published - visible & bookable now</option>
                  <option value="draft">Draft - hidden until you publish</option>
                </select>
              </div>

              {/* Ticket Tiers Form Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Admission Tiers
                  </label>
                  <button
                    type="button"
                    onClick={addTier}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Add Tier
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.ticketTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Tier Name"
                        value={tier.name}
                        onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="Price $"
                        value={tier.price}
                        onChange={(e) => handleTierChange(idx, 'price', e.target.value)}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Capacity"
                        value={tier.capacity}
                        onChange={(e) => handleTierChange(idx, 'capacity', e.target.value)}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      {formData.ticketTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(idx)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
                >
                  {createLoading ? 'Publishing...' : 'Publish Event'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-xl font-semibold text-xs bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
