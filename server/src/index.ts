import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import Message from './models/Message';
import User from './models/User';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

function makeSessionId(){
  return 's_' + Math.random().toString(36).slice(2,10);
}

// In-memory fallback for rooms
const chats: Record<string, Array<any>> = {};

// connect to MongoDB
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/aimbrill';
connectDB(MONGO).catch(()=>{});

io.on('connection', socket => {
  console.log('client connected', socket.id);

  socket.on('join', (payload: any) => {
    const { room, role } = payload || {};
    socket.join(room);
    socket.data.role = role;
    socket.data.room = room;
    console.log(`${socket.id} joined ${room} as ${role}`);
    // upsert user if customer
    try{
      if(role === 'customer'){
        const sessionId = room.replace(/^session:/,'');
        const providedName = payload?.displayName;
        User.findOneAndUpdate({ sessionId }, { sessionId, displayName: providedName }, { upsert: true, new: true }).catch(()=>{});
      }
    }catch(e){}
  });

  socket.on('message', async (msg: any) => {
    const room = msg?.meta?.room || socket.data.room || 'global';
    // attach user if possible
    let userId = null;
    try{
      const sessionId = msg?.meta?.sessionId || room.replace(/^session:/,'');
  const u: any = await User.findOne({ sessionId }).lean();
  if(u && u._id) userId = u._id;
    }catch(e){}
    const meta = { ...(msg.meta || {}), userId };
    const payload = { socketId: socket.id, room, ...msg, meta };
    try{
      const saved = await Message.create({ room, sender: msg.sender, text: msg.text, meta });
      const out = { id: saved._id, socketId: socket.id, sender: msg.sender, text: msg.text, createdAt: saved.createdAt, room, meta: saved.meta };
      io.to(room).emit('message', out);
    }catch(err){
      const p = { id: Date.now(), ...payload };
      chats[room] = chats[room] || [];
      chats[room].push(p);
      io.to(room).emit('message', p);
    }
  });

  // getHistory support: (room, cb) or (room, sessionId, cb)
  socket.on('getHistory', async (room: string, sessionIdOrCb: any, maybeCb?: any) => {
    let sessionId: string | undefined;
    let cb: any = maybeCb;
    if(typeof sessionIdOrCb === 'function'){
      cb = sessionIdOrCb;
    }else{
      sessionId = sessionIdOrCb;
    }
    try{
      const query: any = { room };
      if(sessionId) query['meta.sessionId'] = sessionId;
      const msgs = await Message.find(query).sort({ createdAt: 1 }).lean();
      if(cb) return cb(msgs);
    }catch(err){
      // continue to fallback
    }
    const fallback = (chats[room] || []).filter(m => !sessionId || (m.meta && m.meta.sessionId === sessionId));
    if(cb) return cb(fallback);
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

app.get('/health', (req, res) => res.json({ok: true}));

// create a new user (admin can call this to provision a session)
app.post('/users', async (req, res) => {
  const displayName = (req.body?.displayName || '').trim();
  if(!displayName) return res.status(400).json({ error: 'displayName required' });
  try{
    const existing: any = await User.findOne({ displayName }).lean();
    if(existing){
      return res.json({ sessionId: existing.sessionId, displayName: existing.displayName, room: `session:${existing.sessionId}` });
    }
    const sessionId = makeSessionId();
    const u: any = await User.create({ sessionId, displayName });
    return res.json({ sessionId: u.sessionId, displayName: u.displayName, room: `session:${u.sessionId}` });
  }catch(err){
    return res.status(500).json({ error: 'failed' });
  }
});

app.get('/users/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  try{
  const u: any = await User.findOne({ sessionId }).lean();
  if(!u) return res.status(404).json({});
  return res.json({ sessionId: u.sessionId, displayName: u.displayName, createdAt: u.createdAt });
  }catch(err){
    return res.status(500).json({});
  }
});

app.get('/chats/:room', (req, res) => {
  const room = req.params.room;
  const sessionId = req.query.sessionId as string | undefined;
  // try DB first
  (async ()=>{
    try{
      const query: any = { room };
      if(sessionId) query['meta.sessionId'] = sessionId;
      const msgs = await Message.find(query).sort({ createdAt: 1 }).lean();
      if(msgs && msgs.length) return res.json(msgs);
    }catch(err){
      // continue to fallback
    }
    // fallback: return only messages saved in-memory for that room
    const fallback = (chats[room] || []).filter(m => !sessionId || (m.meta && m.meta.sessionId === sessionId));
    return res.json(fallback);
  })();
});

// list all rooms
app.get('/rooms', (req, res) => {
  (async ()=>{
    try{
      // prefer listing based on Users so admin sees all users
      const users = await User.find({}).lean();
      const result = await Promise.all(users.map(async (u:any)=>{
        const sessionId = u.sessionId;
        const room = `session:${sessionId}`;
        const last: any = await Message.findOne({ room }).sort({ createdAt: -1 }).lean();
        return { room, sessionId, displayName: u.displayName || null, last: last ? { text: last.text, createdAt: last.createdAt } : null };
      }));
      return res.json(result);
    }catch(err){
      // fallback: derive from in-memory chats
      const keys = Object.keys(chats);
      const result = keys.map(k=>{
        const arr = chats[k] || [];
        const last = arr.length ? arr[arr.length-1] : null;
        const sessionId = k.replace(/^session:/,'');
        return { room: k, sessionId, displayName: last?.meta?.displayName || null, last: last ? { text: last.text, createdAt: last.createdAt } : null };
      });
      return res.json(result);
    }
  })();
});

// clear a room's chat history
app.post('/chats/:room/clear', (req, res) => {
  const room = req.params.room;
  (async ()=>{
    try{
      await Message.deleteMany({ room });
    }catch(err){
      // ignore
    }
    chats[room] = [];
    res.json({ok: true});
  })();
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
