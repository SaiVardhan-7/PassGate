import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import TicketPassCard from '../components/TicketPassCard';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Ticket as TicketIcon,
  User,
  ArrowLeft,
  X,
} from 'lucide-react';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTier, setSelectedTier] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookedTicket, setBookedTicket] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
      if (res.data.ticketTiers && res.data.ticketTiers.length > 0) {
        setSelectedTier(res.data.ticketTiers[0].name);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Event not found or failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookTicket = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    if (!selectedTier) {
      setBookingError('Please select a ticket tier.');
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError(null);

      const res = await api.post('/tickets/book', {
        eventId: id,
        tierName: selectedTier,
      });

      setBookedTicket(res.data.ticket);
      setShowSuccessModal(true);

      // Refresh event capacity data
      fetchEventDetails();
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingError(
        err.response?.data?.message || 'Failed to complete reservation. Tier may be sold out.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading event specifications...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="glass-panel p-8 rounded-3xl border border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Event Not Available</h2>
          <p className="text-slate-400 mb-6">{error || 'Unable to retrieve this event.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Events
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();
  const isBookable = event.status === 'published' && !isPast;

  return (
    <div className="min-h-screen pb-24">
      {/* Top Banner & Header */}
      <div className="relative h-80 sm:h-96 w-full overflow-hidden">
        <img
          src={event.bannerUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/60 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-sm font-semibold text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <div className="absolute bottom-8 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Cryptographically Verified Gate Access
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight max-w-4xl">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Event Overview & Specs */}
          <div className="lg:col-span-2 space-y-8">
            {/* Metadata Bar */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Date & Schedule</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Venue Location</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{event.venue}</p>
                  <p className="text-xs text-slate-400">Official Access Point</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800">
              <h2 className="text-lg font-bold text-white mb-3">About the Event</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>

              {/* Organizer Card */}
              {event.organizer && (
                <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                      {event.organizer.name?.charAt(0) || 'O'}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Organized by</p>
                      <p className="text-sm font-semibold text-white">{event.organizer.name}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    Verified Host
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ticket Tier Booking Engine */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TicketIcon className="w-5 h-5 text-indigo-400" />
                  Select Admission Tier
                </h3>
              </div>

              {bookingError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Tier Selection Radio Cards */}
              <div className="space-y-3 mb-6">
                {event.ticketTiers.map((tier) => {
                  const remaining = tier.capacity - tier.sold;
                  const isSoldOut = remaining <= 0;
                  const isSelected = selectedTier === tier.name;
                  const percentSold = Math.round((tier.sold / tier.capacity) * 100);

                  return (
                    <div
                      key={tier.name}
                      onClick={() => !isSoldOut && setSelectedTier(tier.name)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSoldOut
                          ? 'opacity-50 cursor-not-allowed bg-slate-950 border-slate-800'
                          : isSelected
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-glow-primary'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{tier.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {isSoldOut ? (
                              <span className="text-red-400 font-semibold">Sold Out</span>
                            ) : (
                              <span>{remaining} passes remaining</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold text-white">
                            ${tier.price}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar of sold capacity */}
                      <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSoldOut ? 'bg-red-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percentSold}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Book Button */}
              <button
                type="button"
                onClick={handleBookTicket}
                disabled={bookingLoading || !isBookable}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {!isBookable ? (
                  <>{event.status === 'cancelled' ? 'Event Cancelled' : 'Sales Closed'}</>
                ) : bookingLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Locking Reservation...
                  </>
                ) : user ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Reserve Pass for ${event.ticketTiers.find((t) => t.name === selectedTier)?.price || 0}
                  </>
                ) : (
                  <>Sign In to Book Pass</>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500 mt-3 font-mono">
                ⚡ Instant HMAC-SHA256 signature generation on confirmation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Success Modal */}
      {showSuccessModal && bookedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg glass-panel bg-slate-950 p-6 sm:p-8 rounded-3xl border border-indigo-500/40 shadow-2xl">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-glow-success">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Booking Confirmed!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your cryptographic pass has been minted and added to your wallet.
              </p>
            </div>

            {/* Render Sleek Digital Pass */}
            <TicketPassCard ticket={bookedTicket} />

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/my-tickets')}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-center"
              >
                Go to My Passes Wallet
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-center"
              >
                Stay on Event Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
