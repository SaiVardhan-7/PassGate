const express = require('express');
const router = express.Router();
const {
  bookTicket,
  getMyTickets,
  getTicketById,
  cancelTicket,
  verifyTicket,
} = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Book ticket (any authenticated user)
router.post('/book', protect, bookTicket);

// Current user's tickets
router.get('/my-tickets', protect, getMyTickets);

// Gate check-in verification (organizer or admin only)
router.post(
  '/verify',
  protect,
  authorizeRoles('organizer', 'admin'),
  verifyTicket
);

// Cancel ticket (owner/admin)
router.put('/:id/cancel', protect, cancelTicket);

// Get ticket details by ID
router.get('/:id', protect, getTicketById);

module.exports = router;
