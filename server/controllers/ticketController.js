const mongoose = require('mongoose');
const crypto = require('crypto');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const {
  generateQRSignature,
  verifyQRSignature,
  constructQRPayload,
} = require('../utils/cryptoUtils');

// Helper to generate readable ticket number
const generateTicketNumber = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${rand}${digits}`;
};

const generateUniqueTicketNumber = async () => {
  for (let i = 0; i < 10; i++) {
    const candidate = generateTicketNumber();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Ticket.exists({ ticketNumber: candidate });
    if (!exists) return candidate;
  }
  return `${generateTicketNumber()}${Date.now().toString(36).toUpperCase().slice(-3)}`;
};

// @desc    Book ticket with atomic tier capacity check
// @route   POST /api/tickets/book
// @access  Private (attendee/organizer/admin)
const bookTicket = async (req, res) => {
  try {
    const { eventId, tierName } = req.body;

    if (!eventId || !tierName) {
      return res.status(400).json({ message: 'Event ID and Tier Name are required.' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ message: `Cannot book tickets for an event that is ${event.status}.` });
    }

    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: 'This event has already taken place.' });
    }

    const tier = event.ticketTiers.find((t) => t.name.toLowerCase() === tierName.trim().toLowerCase());
    if (!tier) {
      return res.status(404).json({ message: `Ticket tier "${tierName}" not found for this event.` });
    }

    if (tier.sold >= tier.capacity) {
      return res.status(400).json({ message: `Ticket tier "${tier.name}" is completely sold out.` });
    }

    // Atomic update to prevent overselling race conditions
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        // $elemMatch ensures name + capacity are checked on the SAME tier element
        ticketTiers: { $elemMatch: { name: tier.name, sold: { $lt: tier.capacity } } },
      },
      {
        $inc: { 'ticketTiers.$.sold': 1 },
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({
        message: 'Could not reserve ticket: this tier has just sold out!',
      });
    }

    // Generate unique ID and ticket number
    const ticketId = new mongoose.Types.ObjectId();
    const ticketNumber = await generateUniqueTicketNumber();

    // Compute Cryptographic HMAC-SHA256 signature
    const qrSignature = generateQRSignature(ticketId, eventId);

    let ticket;
    try {
      ticket = await Ticket.create({
        _id: ticketId,
        ticketNumber,
        event: eventId,
        attendee: req.user._id,
        tierName: tier.name,
        pricePaid: tier.price,
        status: 'valid',
        qrSignature,
      });
    } catch (createErr) {
      // Roll back the seat reservation so capacity isn't leaked
      await Event.updateOne(
        { _id: eventId, ticketTiers: { $elemMatch: { name: tier.name, sold: { $gt: 0 } } } },
        { $inc: { 'ticketTiers.$.sold': -1 } }
      );
      throw createErr;
    }

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('event', 'title description venue bannerUrl date organizer')
      .populate('attendee', 'name email');

    const qrPayload = constructQRPayload(ticket._id, eventId, qrSignature);

    res.status(201).json({
      message: 'Ticket successfully booked!',
      ticket: {
        ...populatedTicket.toObject(),
        qrPayload,
      },
    });
  } catch (error) {
    console.error('[BookTicket Error]:', error);
    res.status(500).json({ message: error.message || 'Server error booking ticket.' });
  }
};

// @desc    Get all tickets booked by current user
// @route   GET /api/tickets/my-tickets
// @access  Private
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ attendee: req.user._id })
      .populate('event', 'title description venue bannerUrl date status organizer')
      .populate('attendee', 'name email')
      .sort({ createdAt: -1 });

    const formattedTickets = tickets
      .filter((ticket) => ticket.event) // skip tickets whose event no longer exists
      .map((ticket) => {
      const qrPayload = constructQRPayload(ticket._id, ticket.event._id, ticket.qrSignature);
      return {
        ...ticket.toObject(),
        qrPayload,
      };
    });

    res.json(formattedTickets);
  } catch (error) {
    console.error('[GetMyTickets Error]:', error);
    res.status(500).json({ message: error.message || 'Server error fetching tickets.' });
  }
};

// @desc    Get single ticket by ID
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event')
      .populate('attendee', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (!ticket.event) {
      return res.status(404).json({ message: 'The event for this ticket no longer exists.' });
    }

    // Only owner, organizer of the event, or admin can access
    const isOwner = ticket.attendee._id.toString() === req.user._id.toString();
    const isOrganizer = ticket.event.organizer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isOrganizer && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this ticket.' });
    }

    const qrPayload = constructQRPayload(ticket._id, ticket.event._id, ticket.qrSignature);

    res.json({
      ...ticket.toObject(),
      qrPayload,
    });
  } catch (error) {
    console.error('[GetTicketById Error]:', error);
    res.status(500).json({ message: error.message || 'Server error fetching ticket.' });
  }
};

// @desc    Cancel own ticket (frees up tier capacity)
// @route   PUT /api/tickets/:id/cancel
// @access  Private (ticket owner or admin)
const cancelTicket = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket id.' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (ticket.attendee.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this ticket.' });
    }

    if (ticket.status === 'checked_in') {
      return res.status(400).json({ message: 'A ticket that has already been used cannot be cancelled.' });
    }
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ message: 'Ticket is already cancelled.' });
    }

    // Atomic status flip so a double-click can't release two seats
    const cancelled = await Ticket.findOneAndUpdate(
      { _id: ticket._id, status: 'valid' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!cancelled) {
      return res.status(409).json({ message: 'Ticket status changed; please refresh.' });
    }

    await Event.updateOne(
      { _id: ticket.event, ticketTiers: { $elemMatch: { name: ticket.tierName, sold: { $gt: 0 } } } },
      { $inc: { 'ticketTiers.$.sold': -1 } }
    );

    res.json({ message: 'Ticket cancelled successfully.', ticket: cancelled });
  } catch (error) {
    console.error('[CancelTicket Error]:', error);
    res.status(500).json({ message: error.message || 'Server error cancelling ticket.' });
  }
};

// @desc    Gate Check-In & Verification Engine
// @route   POST /api/tickets/verify
// @access  Private (organizer/admin)
const verifyTicket = async (req, res) => {
  try {
    const { payload, eventId, ticketNumber } = req.body;

    if (!eventId) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Active Target Event ID is required for verification.',
      });
    }

    const targetEvent = await Event.findById(eventId);
    if (!targetEvent) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Active target event not found.',
      });
    }

    // Ensure operator is organizer of this event or an admin
    if (
      targetEvent.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        status: 'FORBIDDEN',
        message: 'Forbidden: You are not the organizer for this event gate.',
      });
    }

    let ticket = null;

    // --- CASE A: QR CODE PAYLOAD SCANNED ---
    if (payload) {
      let parsedPayload = null;
      try {
        parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch (e) {
        return res.status(400).json({
          status: 'FORGED',
          message: 'Forged QR Pass: Malformed QR payload structure.',
        });
      }

      const { t: scannedTicketId, e: scannedEventId, s: scannedSignature } = parsedPayload;

      if (!scannedTicketId || !scannedEventId || !scannedSignature) {
        return res.status(400).json({
          status: 'FORGED',
          message: 'Forged QR Pass: Missing cryptographic attributes in pass.',
        });
      }

      // Step 1: Recompute HMAC signature & compare using crypto.timingSafeEqual
      const isSignatureValid = verifyQRSignature(scannedTicketId, scannedEventId, scannedSignature);

      if (!isSignatureValid) {
        return res.status(400).json({
          status: 'FORGED',
          message: 'Forged QR Pass: HMAC-SHA256 signature verification failed! Pass may be counterfeit.',
        });
      }

      // Step 2: Verify ticket belongs to the active event being scanned
      if (scannedEventId.toString() !== eventId.toString()) {
        return res.status(400).json({
          status: 'WRONG_EVENT',
          message: 'Mismatched Event Pass: This ticket was issued for a different event!',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(scannedTicketId)) {
        return res.status(400).json({
          status: 'INVALID',
          message: 'Invalid ticket identification identifier.',
        });
      }

      ticket = await Ticket.findById(scannedTicketId)
        .populate('attendee', 'name email')
        .populate('event', 'title venue date organizer');

      if (!ticket) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: 'Ticket not found in central registry.',
        });
      }

      if (ticket.event._id.toString() !== eventId.toString()) {
        return res.status(400).json({
          status: 'WRONG_EVENT',
          message: 'Ticket belongs to a different event than the active gate.',
        });
      }
    } 
    // --- CASE B: MANUAL FALLBACK INPUT (ticketNumber) ---
    else if (ticketNumber) {
      const cleanNumber = ticketNumber.trim().toUpperCase();
      ticket = await Ticket.findOne({
        ticketNumber: cleanNumber,
        event: eventId,
      })
        .populate('attendee', 'name email')
        .populate('event', 'title venue date organizer');

      if (!ticket) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          message: `Ticket "${cleanNumber}" not found for this event gate.`,
        });
      }
    } else {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Provide either a scanned QR payload or a manual ticket number.',
      });
    }

    // Step 3: Check ticket status
    // 3a: Ticket is CANCELLED
    if (ticket.status === 'cancelled') {
      return res.status(403).json({
        status: 'CANCELLED',
        message: 'TICKET CANCELLED: Entry is strictly forbidden.',
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendee ? ticket.attendee.name : 'Unknown',
        tierName: ticket.tierName,
        ticket,
      });
    }

    // 3b: Ticket is ALREADY CHECKED IN
    if (ticket.status === 'checked_in') {
      const formattedTime = new Date(ticket.checkedInAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });

      return res.status(409).json({
        status: 'ALREADY_SCANNED',
        message: `ALREADY SCANNED at ${formattedTime}`,
        checkedInAt: ticket.checkedInAt,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendee ? ticket.attendee.name : 'Unknown',
        attendeeEmail: ticket.attendee ? ticket.attendee.email : '',
        tierName: ticket.tierName,
        ticket,
      });
    }

    // 3c: Ticket is VALID -> Atomically mark checked_in
    if (ticket.status === 'valid') {
      const updatedTicket = await Ticket.findOneAndUpdate(
        { _id: ticket._id, status: 'valid' },
        { status: 'checked_in', checkedInAt: new Date() },
        { new: true }
      )
        .populate('attendee', 'name email')
        .populate('event', 'title venue date');

      // If race condition:
      if (!updatedTicket) {
        const recheckTicket = await Ticket.findById(ticket._id).populate('attendee', 'name email');
        const formattedTime = new Date(recheckTicket.checkedInAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'medium',
        });
        return res.status(409).json({
          status: 'ALREADY_SCANNED',
          message: `ALREADY SCANNED at ${formattedTime}`,
          checkedInAt: recheckTicket.checkedInAt,
          ticketNumber: recheckTicket.ticketNumber,
          attendeeName: recheckTicket.attendee ? recheckTicket.attendee.name : 'Unknown',
          tierName: recheckTicket.tierName,
          ticket: recheckTicket,
        });
      }

      return res.status(200).json({
        status: 'VALID_ENTRY',
        message: 'VALID ENTRY: Access Granted',
        checkedInAt: updatedTicket.checkedInAt,
        ticketNumber: updatedTicket.ticketNumber,
        attendeeName: updatedTicket.attendee ? updatedTicket.attendee.name : 'Attendee',
        attendeeEmail: updatedTicket.attendee ? updatedTicket.attendee.email : '',
        tierName: updatedTicket.tierName,
        pricePaid: updatedTicket.pricePaid,
        ticket: updatedTicket,
      });
    }

    return res.status(400).json({
      status: 'UNKNOWN',
      message: `Unknown ticket status: ${ticket.status}`,
    });
  } catch (error) {
    console.error('[VerifyTicket Error]:', error);
    res.status(500).json({
      status: 'ERROR',
      message: error.message || 'Server error during ticket verification.',
    });
  }
};

module.exports = {
  bookTicket,
  getMyTickets,
  getTicketById,
  cancelTicket,
  verifyTicket,
};
