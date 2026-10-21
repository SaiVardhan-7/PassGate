const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

// @desc    Get all published events
// @route   GET /api/events
// @access  Public
const getAllEvents = async (req, res) => {
  try {
    const { search, venue } = req.query;
    let query = { status: 'published' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
      ];
    }

    if (venue) {
      query.venue = { $regex: venue, $options: 'i' };
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ date: 1 });

    res.json(events);
  } catch (error) {
    console.error('[GetAllEvents Error]:', error);
    res.status(500).json({ message: error.message || 'Server error fetching events.' });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');

    if (!event || event.status === 'draft') {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.json(event);
  } catch (error) {
    console.error('[GetEventById Error]:', error);
    res.status(500).json({ message: error.message || 'Server error fetching event details.' });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (organizer/admin)
const createEvent = async (req, res) => {
  try {
    const { title, description, venue, bannerUrl, date, ticketTiers, status } = req.body;

    if (!title || !description || !venue || !date || !ticketTiers || ticketTiers.length === 0) {
      return res.status(400).json({ message: 'Please provide all required fields including ticket tiers.' });
    }

    if (Number.isNaN(new Date(date).getTime())) {
      return res.status(400).json({ message: 'Invalid event date.' });
    }

    const formattedTiers = ticketTiers.map((tier) => ({
      name: String(tier.name || '').trim(),
      price: Number(tier.price),
      capacity: Number(tier.capacity),
      sold: 0,
    }));

    const names = formattedTiers.map((t) => t.name.toLowerCase());
    if (
      formattedTiers.some((t) => !t.name || Number.isNaN(t.price) || t.price < 0 || !(t.capacity >= 1)) ||
      new Set(names).size !== names.length
    ) {
      return res.status(400).json({
        message: 'Each tier needs a unique name, a non-negative price and a capacity of at least 1.',
      });
    }

    const event = await Event.create({
      title,
      description,
      venue,
      bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      date: new Date(date),
      organizer: req.user._id,
      ticketTiers: formattedTiers,
      status: status || 'published',
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('[CreateEvent Error]:', error);
    res.status(500).json({ message: error.message || 'Server error creating event.' });
  }
};

// @desc    Update existing event
// @route   PUT /api/events/:id
// @access  Private (organizer/admin)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (
      event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to update this event.' });
    }

    const { title, description, venue, bannerUrl, date, status, ticketTiers } = req.body;

    if (title) event.title = title;
    if (description) event.description = description;
    if (venue) event.venue = venue;
    if (bannerUrl) event.bannerUrl = bannerUrl;
    if (date) event.date = new Date(date);
    if (status) event.status = status;
    if (Array.isArray(ticketTiers) && ticketTiers.length > 0) {
      // Merge by tier name so existing `sold` counters are never overwritten by the client
      const merged = ticketTiers.map((incoming) => {
        const existing = event.ticketTiers.find(
          (t) => t.name.toLowerCase() === String(incoming.name || '').trim().toLowerCase()
        );
        const capacity = Number(incoming.capacity);
        if (existing && capacity < existing.sold) {
          throw new Error(`Capacity for "${existing.name}" cannot be lower than tickets already sold (${existing.sold}).`);
        }
        return {
          name: String(incoming.name).trim(),
          price: Number(incoming.price),
          capacity,
          sold: existing ? existing.sold : 0,
        };
      });
      event.ticketTiers = merged;
    }

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (error) {
    console.error('[UpdateEvent Error]:', error);
    if (error.message && error.message.startsWith('Capacity for')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Server error updating event.' });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (organizer/admin)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (
      event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this event.' });
    }

    // Soft-delete: mark as cancelled so existing tickets keep a valid event reference
    event.status = 'cancelled';
    await event.save();
    await Ticket.updateMany(
      { event: req.params.id, status: { $ne: 'checked_in' } },
      { status: 'cancelled' }
    );

    res.json({ message: 'Event cancelled and outstanding tickets voided.' });
  } catch (error) {
    console.error('[DeleteEvent Error]:', error);
    res.status(500).json({ message: error.message || 'Server error deleting event.' });
  }
};

// @desc    Get dashboard metrics & events for organizer
// @route   GET /api/events/organizer/my-events
// @access  Private (organizer/admin)
const getOrganizerEvents = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { organizer: req.user._id };
    const events = await Event.find(query).sort({ createdAt: -1 });

    const eventIds = events.map((e) => e._id);
    const tickets = await Ticket.find({ event: { $in: eventIds } });

    // Aggregate statistics per event
    const eventsWithStats = events.map((event) => {
      const eventTickets = tickets.filter(
        (t) => t.event.toString() === event._id.toString()
      );

      const totalSold = eventTickets.filter((t) => t.status !== 'cancelled').length;
      const checkedInCount = eventTickets.filter((t) => t.status === 'checked_in').length;
      const totalRevenue = eventTickets
        .filter((t) => t.status !== 'cancelled')
        .reduce((sum, t) => sum + (t.pricePaid || 0), 0);
      const totalCapacity = event.ticketTiers.reduce((sum, tier) => sum + tier.capacity, 0);

      return {
        ...event.toObject(),
        stats: {
          totalSold,
          checkedInCount,
          totalRevenue,
          totalCapacity,
          attendanceRate: totalSold > 0 ? Math.round((checkedInCount / totalSold) * 100) : 0,
        },
      };
    });

    const overallMetrics = {
      totalEvents: events.length,
      totalTicketsSold: tickets.filter((t) => t.status !== 'cancelled').length,
      totalCheckedIn: tickets.filter((t) => t.status === 'checked_in').length,
      totalRevenue: tickets
        .filter((t) => t.status !== 'cancelled')
        .reduce((sum, t) => sum + (t.pricePaid || 0), 0),
    };

    res.json({
      metrics: overallMetrics,
      events: eventsWithStats,
    });
  } catch (error) {
    console.error('[GetOrganizerEvents Error]:', error);
    res.status(500).json({ message: error.message || 'Server error fetching organizer events.' });
  }
};

// @desc    Get attendee list for a specific event
// @route   GET /api/events/:id/attendees
// @access  Private (organizer/admin)
const getEventAttendees = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (
      event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to view attendee roster for this event.' });
    }

    const tickets = await Ticket.find({ event: req.params.id })
      .populate('attendee', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      eventTitle: event.title,
      eventDate: event.date,
      tickets,
    });
  } catch (error) {
    console.error('[GetEventAttendees Error]:', error);
    res.status(500).json({ message: error.message || 'Server error fetching attendees.' });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  getEventAttendees,
};
