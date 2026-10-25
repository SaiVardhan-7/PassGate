# PassGate – Event Ticketing & QR Pass Management System

MERN stack app: attendees book tiered tickets and receive HMAC-SHA256-signed QR passes; organizers
create events, watch live sales analytics and check people in at the gate with a camera scanner.

## Features
- JWT auth with roles: `attendee`, `organizer`, `admin` (admin cannot be self-registered)
- Events with multiple ticket tiers, draft / published / completed / cancelled states
- Atomic booking (`$elemMatch` + `$inc`) so tiers can never be oversold, with rollback on failure
- Tamper-proof QR passes: `HMAC-SHA256(ticketId:eventId)`, verified with `timingSafeEqual`
- Attendee wallet: view / print passes, copy payload, cancel a ticket (frees the seat)
- Organizer dashboard: revenue, sales, check-in rate, roster, publish / complete / cancel event
- Gate scanner: live camera (html5-qrcode) + manual ticket number or pasted payload,
  audio feedback, duplicate-scan protection, scan history

## Setup
Requires Node 18+ and a running MongoDB.

```bash
# 1. API
cd server
npm install
npm run dev               # http://localhost:5000

# 2. Web app (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173  (proxies /api -> :5000)
```

### Demo accounts (after `npm run seed`, password `Password123!`)
| Role | Email |
|------|-------|
| Organizer | organizer@eventpass.io |
| Attendee | attendee@eventpass.io |
| Admin | admin@eventpass.io |

Seeded tickets `TKT-VIP9012` and `TKT-EDM5431` can be used on the Scan Gate page
(select the matching event first).

## API summary
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | user |
| GET | /api/events, /api/events/:id | public (published only) |
| POST/PUT/DELETE | /api/events[/:id] | organizer/admin (DELETE = cancel event) |
| GET | /api/events/organizer/my-events, /api/events/:id/attendees | organizer/admin |
| POST | /api/tickets/book | user |
| GET | /api/tickets/my-tickets, /api/tickets/:id | owner/organizer/admin |
| PUT | /api/tickets/:id/cancel | owner/admin |
| POST | /api/tickets/verify | organizer/admin |

> Camera scanning needs HTTPS or `localhost`.
