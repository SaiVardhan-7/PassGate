import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  Search,
  Calendar,
  MapPin,
  Tag,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Loader2,
  Users,
} from 'lucide-react';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async (searchQuery = '') => {
    try {
      setLoading(true);
      const url = searchQuery ? `/events?search=${encodeURIComponent(searchQuery)}` : '/events';
      const res = await api.get(url);
      setEvents(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Unable to load events right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents(search);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-teal-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-glow-primary">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Anti-Fraud HMAC Cryptographic Verification</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Next-Gen Event Passes with{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Cryptographic Trust
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Book tickets with atomic concurrency guarantees, access tamper-proof wallet passes,
              and verify admissions in sub-seconds with optical gate scanning.
            </p>

            {/* Search Input Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-10 max-w-xl mx-auto flex items-center glass-panel rounded-2xl p-2 border border-slate-700/80 shadow-2xl focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
            >
              <div className="pl-3 pr-2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search summits, conferences, music festivals, venues..."
                className="w-full bg-transparent border-none text-white placeholder-slate-400 text-sm focus:outline-none py-2"
              />
              <button
                type="submit"
                className="ml-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30 flex-shrink-0"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Events Listing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Featured Upcoming Events
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure your reservation before tiers reach capacity.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700">
            {events.length} Available Events
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Loading verified events...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 p-6 glass-panel rounded-2xl border border-red-500/30">
            <p className="text-red-400 font-medium mb-3">{error}</p>
            <button
              onClick={() => fetchEvents()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 p-8 glass-panel rounded-3xl border border-slate-800">
            <p className="text-lg font-semibold text-slate-300">No events matched your query.</p>
            <p className="text-sm text-slate-500 mt-1">Try searching with different keywords.</p>
            <button
              onClick={() => {
                setSearch('');
                fetchEvents('');
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => {
              const eventDate = new Date(event.date);
              const minPrice = Math.min(...event.ticketTiers.map((t) => t.price));
              const totalCapacity = event.ticketTiers.reduce((acc, t) => acc + t.capacity, 0);
              const totalSold = event.ticketTiers.reduce((acc, t) => acc + t.sold, 0);
              const isSoldOut = totalSold >= totalCapacity;

              return (
                <div
                  key={event._id}
                  className="glass-panel glass-panel-hover rounded-3xl overflow-hidden flex flex-col border border-slate-800/80 group"
                >
                  {/* Banner Image */}
                  <div className="relative h-48 overflow-hidden bg-slate-900">
                    <img
                      src={event.bannerUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-700/80 flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {eventDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4">
                      <span className="text-xs font-bold text-white bg-indigo-600/90 backdrop-blur-md px-3 py-1 rounded-lg border border-indigo-400/30">
                        From ${minPrice}
                      </span>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>

                      <div className="mt-4 space-y-2 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <span className="truncate">{event.venue}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>
                            {totalSold} / {totalCapacity} passes claimed
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>{event.ticketTiers.length} Tiers Available</span>
                      </div>

                      <Link
                        to={`/events/${event._id}`}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                          isSoldOut
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                        }`}
                      >
                        {isSoldOut ? 'Sold Out' : 'Select Tier'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
