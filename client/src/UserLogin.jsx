import React, { useState } from 'react';
import { API_SERVER } from './config';

export default function UserLogin({ onSet }){
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if(!name) return;
    setLoading(true);
    try{
      const res = await fetch(`${API_SERVER}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: name }) });
      const json = await res.json();
      // server returns { sessionId, displayName, room }
      localStorage.setItem('aimbrill_name', json.displayName || name);
      localStorage.setItem('aimbrill_session', json.sessionId);
      if(typeof onSet === 'function') onSet({ displayName: json.displayName || name, sessionId: json.sessionId, room: json.room });
    }catch(err){
      // fallback: store locally
      localStorage.setItem('aimbrill_name', name);
      const sid = 's_' + Math.random().toString(36).slice(2,10);
      localStorage.setItem('aimbrill_session', sid);
      if(typeof onSet === 'function') onSet({ displayName: name, sessionId: sid, room: `session:${sid}` });
    }finally{ setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow max-w-sm w-full">
        <h3 className="font-bold mb-2">Enter your name</h3>
        <form onSubmit={submit} className="flex gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="flex-1 border p-2 rounded" />
          <button disabled={loading} className="bg-blue-600 text-white px-3 py-1 rounded">{loading? 'Creating...' : 'Start'}</button>
        </form>
      </div>
    </div>
  );
}
