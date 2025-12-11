Server for Aimbrill Chat

Run:
cd server
npm install
npm run dev

API:
GET /health
GET /chats/:room

Socket.IO events:
- join {room, role}
- message {text, sender}
- getHistory room, callback
