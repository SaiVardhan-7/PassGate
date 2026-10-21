require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Event = require('./models/Event');
const Ticket = require('./models/Ticket');
const { generateQRSignature, constructQRPayload } = require('./utils/cryptoUtils');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_ticketing_db';
    await mongoose.connect(mongoUri);
    console.log('[Seed]: Connected to MongoDB at', mongoUri);

    // Clear existing collections
    await User.deleteMany({});
    await Event.deleteMany({});
    await Ticket.deleteMany({});
    console.log('[Seed]: Cleared existing Users, Events, and Tickets.');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    const organizer = await User.create({
      name: 'Alex Rivera',
      email: 'organizer@eventpass.io',
      passwordHash,
      role: 'organizer',
    });

    const attendee = await User.create({
      name: 'Jordan Lee',
      email: 'attendee@eventpass.io',
      passwordHash,
      role: 'attendee',
    });

    const admin = await User.create({
      name: 'Sarah Chen (Admin)',
      email: 'admin@eventpass.io',
      passwordHash,
      role: 'admin',
    });

    console.log(`[Seed]: Created 3 Users (Organizer, Attendee, Admin).`);

    // 2. Create 3 Realistic Events
    const now = new Date();

    const event1 = await Event.create({
      title: 'Global AI & Web3 Innovators Summit 2026',
      description: 'The premier conference uniting founders, researchers, and engineers pioneering Autonomous Agents, Decentralized Infrastructure, and Next-Gen Foundation Models.',
      venue: 'Grand Tech Pavilion, Silicon Bay, San Francisco, CA',
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // in 7 days
      organizer: organizer._id,
      ticketTiers: [
        { name: 'Early Bird', price: 99, capacity: 100, sold: 1 },
        { name: 'General Admission', price: 149, capacity: 250, sold: 0 },
        { name: 'VIP All-Access', price: 399, capacity: 50, sold: 1 },
      ],
      status: 'published',
    });

    const event2 = await Event.create({
      title: 'CyberPulse Electronic Music & Visual Arts Festival',
      description: 'A mind-bending 3-day immersive audiovisual experience featuring world-class synthwave, techno pioneers, and 360-degree holographic laser installations.',
      venue: 'Neon Arena & Open Air Amphitheater, Austin, TX',
      bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      date: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000), // in 18 days
      organizer: organizer._id,
      ticketTiers: [
        { name: 'GA Weekend Pass', price: 85, capacity: 500, sold: 1 },
        { name: 'Backstage VIP', price: 220, capacity: 80, sold: 0 },
        { name: 'Ultra Lounge Experience', price: 450, capacity: 25, sold: 0 },
      ],
      status: 'published',
    });

    const event3 = await Event.create({
      title: 'NextGen Cloud & Distributed Architecture Con',
      description: 'Deep dive into zero-downtime microservices, event-driven architectures, edge computing, and Kubernetes resilience with top global architects.',
      venue: 'Metropolitan Convention Center, Manhattan, New York, NY',
      bannerUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // in 30 days
      organizer: organizer._id,
      ticketTiers: [
        { name: 'Standard Developer Pass', price: 199, capacity: 300, sold: 0 },
        { name: 'Workshop + Full Pass', price: 349, capacity: 75, sold: 0 },
        { name: 'Executive Leader Pass', price: 599, capacity: 30, sold: 0 },
      ],
      status: 'published',
    });

    console.log(`[Seed]: Created 3 realistic Events.`);

    // 3. Create 2 Sample Tickets for Jordan Lee (Attendee)
    // Ticket 1: For Summit (VIP All-Access)
    const ticket1Id = new mongoose.Types.ObjectId();
    const sig1 = generateQRSignature(ticket1Id, event1._id);
    const ticket1 = await Ticket.create({
      _id: ticket1Id,
      ticketNumber: 'TKT-VIP9012',
      event: event1._id,
      attendee: attendee._id,
      tierName: 'VIP All-Access',
      pricePaid: 399,
      status: 'valid',
      qrSignature: sig1,
    });

    // Ticket 2: For CyberPulse (GA Weekend Pass)
    const ticket2Id = new mongoose.Types.ObjectId();
    const sig2 = generateQRSignature(ticket2Id, event2._id);
    const ticket2 = await Ticket.create({
      _id: ticket2Id,
      ticketNumber: 'TKT-EDM5431',
      event: event2._id,
      attendee: attendee._id,
      tierName: 'GA Weekend Pass',
      pricePaid: 85,
      status: 'valid',
      qrSignature: sig2,
    });

    console.log(`[Seed]: Created 2 Sample Tickets with Anti-Fraud HMAC signatures.`);

    console.log('\n================ SEED DATA READY ================');
    console.log('User Credentials (all passwords: Password123!):');
    console.log(' - Organizer: organizer@eventpass.io');
    console.log(' - Attendee:  attendee@eventpass.io');
    console.log(' - Admin:     admin@eventpass.io');
    console.log('\nSample Ticket 1:');
    console.log(' - Ticket #:', ticket1.ticketNumber);
    console.log(' - Event:', event1.title);
    console.log(' - Payload:', constructQRPayload(ticket1._id, event1._id, sig1));
    console.log('\nSample Ticket 2:');
    console.log(' - Ticket #:', ticket2.ticketNumber);
    console.log(' - Event:', event2.title);
    console.log(' - Payload:', constructQRPayload(ticket2._id, event2._id, sig2));
    console.log('=================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
