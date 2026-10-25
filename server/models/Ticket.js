const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tierName: {
      type: String,
      required: true,
      trim: true,
    },
    pricePaid: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['valid', 'checked_in', 'cancelled'],
      default: 'valid',
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    qrSignature: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
