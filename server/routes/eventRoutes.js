const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  getEventAttendees,
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', getAllEvents);

// Organizer routes (placed before /:id to prevent routing conflict)
router.get(
  '/organizer/my-events',
  protect,
  authorizeRoles('organizer', 'admin'),
  getOrganizerEvents
);

router.get('/:id', getEventById);

router.get(
  '/:id/attendees',
  protect,
  authorizeRoles('organizer', 'admin'),
  getEventAttendees
);

// Protected mutation routes
router.post(
  '/',
  protect,
  authorizeRoles('organizer', 'admin'),
  createEvent
);

router.put(
  '/:id',
  protect,
  authorizeRoles('organizer', 'admin'),
  updateEvent
);

router.delete(
  '/:id',
  protect,
  authorizeRoles('organizer', 'admin'),
  deleteEvent
);

module.exports = router;
