import React, { useEffect, useState, useRef } from 'react';
import socketService from '../services/socket';
import { API_SERVER } from '../config';

export default function ChatView({user, room, onClear, onSend}){
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const viewRef = useRef(null);

  useEffect(()=>{
    if(!room) return;
    if(socketService && socketService.isConnected()){
      socketService.emit('join', { room, role: 'admin' });
      socketService.on('message', (m)=>{
        if(m.room === room || m.meta?.room === room) setMessages(prev => {
          const last = prev[prev.length-1];
          const key = `${m.sender}|${m.text}|${new Date(m.createdAt).toISOString()}`;
          const lastKey = last ? `${last.sender}|${last.text}|${new Date(last.createdAt).toISOString()}` : null;
          if(lastKey === key) return prev;
          return [...prev, m];
        });
      });
    }
    return ()=>{
      if(socketService) socketService.off('message');
    }
  },[room]);

  useEffect(()=>{
    if(!room || !user) return;
    // try server; include sessionId
    const sessionId = user.sessionId || room.replace(/^session:/,'');
    fetch(`${API_SERVER}/chats/${room}?sessionId=${encodeURIComponent(sessionId)}`).then(r=>r.json()).then(setMessages).catch(()=>{
      const saved = localStorage.getItem(`chat:${room}`);
      if(saved) setMessages(JSON.parse(saved));
    });
  },[room, user]);

  useEffect(()=>{
    if(!viewRef.current) return;
    viewRef.current.scrollTop = viewRef.current.scrollHeight;
  },[messages]);

  const send = ()=>{
    if(!text) return;
    const msg = { id: Date.now(), text, sender: 'admin', createdAt: Date.now() };
    setText('');
    // Delegate actual send (socket emit) to parent via onSend to avoid double-emits
  if(typeof onSend === 'function') onSend(room, msg);
    // If offline, append locally and persist. If online, server echo will add the message.
    if(!(socketService && socketService.isConnected())){
      const next = [...messages, msg];
      setMessages(next);
      localStorage.setItem(`chat:${room}`, JSON.stringify(next));
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b">Conversation: {room}</div>
      <div ref={viewRef} className="p-3 flex-1 overflow-auto">
        {messages.map(m=> (
          <div key={m.id} className={`mb-2 ${m.sender==='admin' ? 'text-right':'text-left'}`}>
            <div className="inline-block bg-gray-100 px-3 py-1 rounded">{m.text}</div>
            <div className="text-xs text-gray-400">{new Date(m.createdAt||Date.now()).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 border p-2 rounded" />
        <button onClick={send} className="bg-blue-600 text-white px-3 py-1 rounded">Reply</button>
        <button onClick={()=>{localStorage.removeItem(`chat:${room}`); setMessages([]); if(onClear) onClear(room);}} className="bg-red-500 text-white px-3 py-1 rounded">Clear</button>
      </div>
    </div>
  );
}
