import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../config';

export default function ChatList({onSelect}){
  const [rooms, setRooms] = useState([]);

  useEffect(()=>{
    fetch(`${API_SERVER}/rooms`).then(r=>r.json()).then(async (rs)=>{
      if(!Array.isArray(rs)) return setRooms([]);
      // if server returned array of objects {room,last} use directly
      if(rs.length>0 && typeof rs[0] === 'object'){
        // expected shape: { room, sessionId, displayName, last }
        const normalized = rs.map(it => ({ room: it.room, sessionId: it.sessionId, displayName: it.displayName || (it.last && it.last.displayName) || null, last: it.last || null }));
        return setRooms(normalized);
      }
      // otherwise rs is array of room strings
      const withMeta = await Promise.all(rs.map(async (room)=>{
        try{
          const res = await fetch(`${API_SERVER}/chats/${room}`);
          const msgs = await res.json();
          const last = msgs.length ? msgs[msgs.length-1] : null;
          return { room, last };
        }catch(err){
          return { room, last: null };
        }
      }));
      setRooms(withMeta);
    }).catch(()=>{
      // on error, just set empty list (avoid exposing localStorage chats)
      setRooms([]);
    });
  },[]);

  return (
    <div className="p-3 border-r h-full w-64">
      <h3 className="font-bold mb-2">Chats</h3>
      <ul className="flex flex-col gap-2">
        {rooms.length===0 && <li className="text-gray-400">No rooms</li>}
        {rooms.map(r=> (
          <li key={r.room}>
            <button onClick={()=>onSelect(r)} className="w-full text-left p-2 hover:bg-gray-100 rounded">
              <div className="flex justify-between">
    <div className="font-medium">{r.displayName || (r.sessionId?.slice(0,8) || r.room)}</div>
    <div className="text-xs text-gray-400">{r.last ? new Date(r.last.createdAt).toLocaleTimeString() : ''}</div>
              </div>
              {r.last && <div className="text-sm text-gray-600 truncate">{r.last.text}</div>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
