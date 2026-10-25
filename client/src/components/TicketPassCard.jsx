import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  MapPin,
  Clock,
  Printer,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  User,
  Sparkles,
} from 'lucide-react';

const TicketPassCard = ({ ticket }) => {
  const printRef = useRef();

  if (!ticket) return null;

  const event = ticket.event || {};
  const eventDate = event.date ? new Date(event.date) : new Date();
  const isValid = ticket.status === 'valid';
  const isCheckedIn = ticket.status === 'checked_in';
  const isCancelled = ticket.status === 'cancelled';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative group max-w-md w-full mx-auto my-4 transition-all duration-300">
      {/* Outer Card with Wallet/Perforation Styling */}
      <div
        ref={printRef}
        className="ticket-pass-print bg-gradient-to-b from-slate-900 via-slate-900 to-[#0e1424] border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl relative"
      >
        {/* Top Header / Event Visual Banner */}
        <div className="relative h-44 overflow-hidden">
          <img
            src={event.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isValid && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-glow-success">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                VALID PASS
              </span>
            )}
            {isCheckedIn && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                CHECKED IN
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 backdrop-blur-md">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                CANCELLED
              </span>
            )}
          </div>

          {/* Tier Tag */}
          <div className="absolute bottom-3 left-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-extrabold bg-indigo-600/90 text-white backdrop-blur-md border border-indigo-400/40 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {ticket.tierName || 'General'}
            </span>
          </div>
        </div>

        {/* Event Title & Basic Metadata */}
        <div className="p-5 pb-4">
          <h3 className="text-xl font-bold text-white leading-snug line-clamp-2">
            {event.title || 'Exclusive Event Pass'}
          </h3>

          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>
                {eventDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-slate-500">•</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span>
                {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="truncate">{event.venue || 'Global Convention Center'}</span>
            </div>
          </div>
        </div>

        {/* Perforated Divider with Side Notches */}
        <div className="relative py-2 flex items-center">
          {/* Left Cutout Circle */}
          <div className="w-6 h-6 bg-[#0b0f19] rounded-full -ml-3 border-r border-slate-700/80" />
          {/* Perforated Dotted Line */}
          <div className="flex-1 border-b-2 border-dashed border-slate-700 mx-2" />
          {/* Right Cutout Circle */}
          <div className="w-6 h-6 bg-[#0b0f19] rounded-full -mr-3 border-l border-slate-700/80" />
        </div>

        {/* Lower Pass Details & QR Code Section */}
        <div className="p-6 pt-2">
          <div className="grid grid-cols-2 gap-4 text-xs mb-5">
            <div>
              <p className="text-slate-400 font-medium">Attendee</p>
              <p className="font-semibold text-white truncate text-sm mt-0.5">
                {ticket.attendee?.name || 'Authorized Guest'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {ticket.attendee?.email || ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-medium">Price Paid</p>
              <p className="font-bold text-white text-base mt-0.5">
                ${ticket.pricePaid ?? 0}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">USD Guaranteed</p>
            </div>
          </div>

          {/* High-Contrast Cryptographic QR Code Container */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg mx-auto max-w-[240px]">
            <QRCodeSVG
              value={ticket.qrPayload || JSON.stringify({ t: ticket._id, e: event._id, s: ticket.qrSignature })}
              size={180}
              level="H"
              includeMargin={false}
              className="w-full h-auto"
            />
            <div className="mt-2 text-center">
              <p className="text-[10px] font-mono font-bold text-slate-900 tracking-wider">
                {ticket.ticketNumber}
              </p>
              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-medium mt-0.5">
                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                <span>HMAC-SHA256 Protected</span>
              </div>
            </div>
          </div>

          {/* Checked-in status timestamp if used */}
          {isCheckedIn && ticket.checkedInAt && (
            <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-xs text-amber-300 font-medium">
                Pass Scanned at Gate:
              </p>
              <p className="text-[11px] font-mono text-amber-200">
                {new Date(ticket.checkedInAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Card Footer / Action */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between no-print">
          <span className="text-[11px] font-mono text-slate-400">
            ID: {ticket.ticketNumber}
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save Pass
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketPassCard;
