import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import QRScanner from '../components/QRScanner';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  User,
  Ticket,
  ArrowRight,
  Sparkles,
  Camera,
  Keyboard,
  History,
  Volume2,
  VolumeX,
} from 'lucide-react';

const ScanGate = () => {
  const [searchParams] = useSearchParams();
  const targetEventIdParam = searchParams.get('eventId');

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(targetEventIdParam || '');
  const [manualTicketNumber, setManualTicketNumber] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Scan Verification Overlay Result
  const [scanResult, setScanResult] = useState(null);
  // Scan history log
  const [scanHistory, setScanHistory] = useState([]);

  // Audio Context Ref for synthesised audio feedback
  const audioCtxRef = useRef(null);
  // Refs keep the camera callback (created once) in sync with latest state
  const isVerifyingRef = useRef(false);
  const selectedEventRef = useRef(selectedEventId);
  const lastScanRef = useRef({ text: '', at: 0 });

  useEffect(() => {
    selectedEventRef.current = selectedEventId;
  }, [selectedEventId]);

  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  const fetchOrganizerEvents = async () => {
    try {
      const res = await api.get('/events/organizer/my-events');
      const eventList = res.data.events || [];
      setEvents(eventList);
      if (!selectedEventRef.current && eventList.length > 0) {
        setSelectedEventId(eventList[0]._id);
      }
    } catch (err) {
      console.error('Failed to load events for scan gate:', err);
    }
  };

  // Sound Synthesizer using Web Audio API
  const playFeedbackSound = (type) => {
    if (!audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'valid') {
        // High-pitched pleasant dual chime (success)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.setValueAtTime(1320, now + 0.1); // E6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.35);
      } else if (type === 'duplicate') {
        // Two warning pulses
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(370, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Low buzzing error tone (counterfeit / forged / cancelled)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.4);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.warn('Audio synthesis note:', e);
    }
  };

  const handleVerify = async (verificationPayload) => {
    const activeEventId = selectedEventRef.current;
    if (!activeEventId) {
      alert('Please select an active target event gate.');
      return;
    }

    if (isVerifyingRef.current) return; // Prevent duplicate rapid scans

    isVerifyingRef.current = true;
    setIsVerifying(true);

    try {
      const body = {
        eventId: activeEventId,
        ...verificationPayload,
      };

      const res = await api.post('/tickets/verify', body);
      const data = res.data;

      // VALID ENTRY
      playFeedbackSound('valid');
      const resultObj = {
        type: 'valid',
        status: data.status,
        message: data.message || 'VALID ENTRY: Access Granted',
        attendeeName: data.attendeeName,
        attendeeEmail: data.attendeeEmail,
        tierName: data.tierName,
        ticketNumber: data.ticketNumber,
        checkedInAt: data.checkedInAt || new Date().toISOString(),
        scannedAt: new Date().toISOString(),
      };
      setScanResult(resultObj);
      setScanHistory((prev) => [resultObj, ...prev.slice(0, 19)]);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data || {};

      if (status === 409) {
        // DUPLICATE SCAN / ALREADY SCANNED
        playFeedbackSound('duplicate');
        const resultObj = {
          type: 'duplicate',
          status: data.status,
          message: data.message || 'ALREADY SCANNED: Duplicate check-in attempt',
          attendeeName: data.attendeeName || 'Unknown Attendee',
          attendeeEmail: data.attendeeEmail || '',
          tierName: data.tierName || '',
          ticketNumber: data.ticketNumber || '',
          checkedInAt: data.checkedInAt,
          scannedAt: new Date().toISOString(),
        };
        setScanResult(resultObj);
        setScanHistory((prev) => [resultObj, ...prev.slice(0, 19)]);
      } else {
        // FORGED, CANCELLED, WRONG EVENT, OR NOT FOUND
        playFeedbackSound('error');
        const resultObj = {
          type: 'error',
          status: data.status || 'FORGED',
          message: data.message || 'Access Denied: Invalid or Counterfeit Pass',
          attendeeName: data.attendeeName || 'Unknown',
          ticketNumber: data.ticketNumber || manualTicketNumber || '',
          checkedInAt: null,
          scannedAt: new Date().toISOString(),
        };
        setScanResult(resultObj);
        setScanHistory((prev) => [resultObj, ...prev.slice(0, 19)]);
      }
    } finally {
      isVerifyingRef.current = false;
      setIsVerifying(false);
      setManualTicketNumber('');
      // refresh admitted counters for the active gate
      fetchOrganizerEvents();
    }
  };

  const handleCameraScanSuccess = (decodedText) => {
    // Throttle repeated triggers (camera sees the same QR many times per second)
    const now = Date.now();
    if (isVerifyingRef.current) return;
    if (lastScanRef.current.text === decodedText && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { text: decodedText, at: now };
    handleVerify({ payload: decodedText });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const value = manualTicketNumber.trim();
    if (!value) return;
    // A pasted QR JSON payload is verified cryptographically; anything else is a ticket number
    if (value.startsWith('{')) {
      handleVerify({ payload: value });
    } else {
      handleVerify({ ticketNumber: value });
    }
  };

  const activeEvent = events.find((e) => e._id === selectedEventId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      {/* Top Gate Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2 shadow-glow-success">
            <ShieldCheck className="w-4 h-4" />
            Live Access Verification Engine
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Gate Check-In & Scanner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Recomputes cryptographic HMAC signatures and executes atomic check-ins.
          </p>
        </div>

        {/* Audio Toggle & Quick Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2 text-xs font-semibold ${
              audioEnabled
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}
            title={audioEnabled ? 'Mute Audio Signals' : 'Unmute Audio Signals'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Audio Chimes On' : 'Audio Muted'}</span>
          </button>
        </div>
      </div>

      {/* Target Event Selection Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Active Gate Admission Target
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setScanResult(null);
            }}
            className="w-full sm:w-96 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
          >
            {events.length === 0 && <option value="">No events found</option>}
            {events.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title} ({new Date(e.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {activeEvent && (
          <div className="flex items-center gap-6 text-xs text-slate-400 sm:text-right w-full sm:w-auto justify-between sm:justify-end">
            <div>
              <p className="font-semibold text-white">{activeEvent.venue}</p>
              <p className="text-[11px] text-slate-500">Venue</p>
            </div>
            <div>
              <p className="font-bold text-emerald-400">
                {activeEvent.stats?.checkedInCount || 0} / {activeEvent.stats?.totalSold || 0}
              </p>
              <p className="text-[11px] text-slate-500">Admitted</p>
            </div>
          </div>
        )}
      </div>

      {/* Visual Feedback Overlay Banner when Scan Completes */}
      {scanResult && (
        <div
          className={`mb-8 p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-2xl ${
            scanResult.type === 'valid'
              ? 'bg-emerald-950/70 border-emerald-500/80 shadow-glow-success'
              : scanResult.type === 'duplicate'
              ? 'bg-amber-950/70 border-amber-500/80'
              : 'bg-red-950/70 border-red-500/80 shadow-glow-danger'
          }`}
        >
          {/* Subtle ambient flash overlay */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  scanResult.type === 'valid'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg'
                    : scanResult.type === 'duplicate'
                    ? 'bg-amber-500 text-slate-950 shadow-lg'
                    : 'bg-red-500 text-white shadow-lg'
                }`}
              >
                {scanResult.type === 'valid' && <CheckCircle2 className="w-8 h-8" />}
                {scanResult.type === 'duplicate' && <AlertTriangle className="w-8 h-8" />}
                {scanResult.type === 'error' && <AlertOctagon className="w-8 h-8" />}
              </div>

              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 ${
                    scanResult.type === 'valid'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                      : scanResult.type === 'duplicate'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                      : 'bg-red-500/30 text-red-300 border border-red-400/40'
                  }`}
                >
                  {scanResult.status}
                </span>

                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {scanResult.message}
                </h2>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-200">
                  {scanResult.attendeeName && (
                    <span className="font-semibold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {scanResult.attendeeName}
                    </span>
                  )}
                  {scanResult.tierName && (
                    <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700 font-mono text-[11px]">
                      Tier: {scanResult.tierName}
                    </span>
                  )}
                  {scanResult.ticketNumber && (
                    <span className="font-mono text-slate-300 font-bold">
                      {scanResult.ticketNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setScanResult(null)}
              className="px-4 py-2 rounded-xl bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700/80 self-end sm:self-center"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Scanner & Manual Fallback Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Optical Camera Viewfinder */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                Live Camera Gate Viewfinder
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                15 FPS High Accuracy
              </span>
            </div>

            <QRScanner
              onScanSuccess={handleCameraScanSuccess}
              isScanning={isScanning}
              onToggleScanning={setIsScanning}
            />

            {/* Quick Helper for Demo Scanning */}
            <div className="mt-6 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 w-full max-w-sm">
              <p className="font-bold flex items-center gap-1.5 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                Testing without a physical camera?
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                You can test instant verification by using the manual ticket number input on the right (e.g. <span className="font-mono text-white font-bold">TKT-VIP9012</span>) or paste the JSON payload into manual input!
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Manual Fallback Input & Scan History Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Manual Input Fallback */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-purple-400" />
              Manual Fallback Gate Entry
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter ticket number (or paste raw scanned JSON payload) if barcode/screen is unreadable:
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                value={manualTicketNumber}
                onChange={(e) => setManualTicketNumber(e.target.value)}
                placeholder='e.g. TKT-VIP9012 or {"t":"...","e":"...","s":"..."}'
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isVerifying || !manualTicketNumber.trim()}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all disabled:opacity-50"
              >
                {isVerifying ? 'Verifying with HMAC Engine...' : 'Authorize Manual Entry'}
              </button>
            </form>
          </div>

          {/* Real-Time Scan History Log */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Live Gate Admission Activity
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                {scanHistory.length} Recorded
              </span>
            </div>

            {scanHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No tickets scanned during this active session.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {scanHistory.map((scan, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            scan.type === 'valid'
                              ? 'bg-emerald-400'
                              : scan.type === 'duplicate'
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                          }`}
                        />
                        <span className="font-bold text-white">
                          {scan.attendeeName || 'Attendee'}
                        </span>
                        {scan.tierName && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({scan.tierName})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {scan.ticketNumber}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          scan.type === 'valid'
                            ? 'text-emerald-400'
                            : scan.type === 'duplicate'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {scan.type === 'valid' ? 'Admitted' : scan.type === 'duplicate' ? 'Duplicate' : 'Denied'}
                      </span>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {scan.scannedAt ? new Date(scan.scannedAt).toLocaleTimeString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanGate;
