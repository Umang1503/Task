import React, { useState } from 'react';
import ChatList from './ChatList';
import ChatView from './ChatView';
import socketService from '../services/socket';
import { API_SERVER } from '../config';

export default function AdminDashboard({ user, onClose }){
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSend = (room, msg) => {
    if(socketService.isConnected()){
      socketService.emit('message', { text: msg.text, sender: 'admin', meta: { room } });
    }
  };

  const handleClear = (room) => {
    if(socketService.isConnected()){
      fetch(`${API_SERVER}/chats/${room}/clear`, { method: 'POST' }).catch(()=>{});
    } else {
      localStorage.removeItem(`chat:${room}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded shadow-lg flex h-[80vh] overflow-hidden">
        <div className="w-64 border-r p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold">Admin</div>
            <div>
              <button onClick={onClose} className="text-sm text-gray-500">Close</button>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">Signed in as {user?.username}</div>
        </div>

        <div className="flex-1 flex">
          <ChatList key={refreshKey} onSelect={(user)=>{ setSelectedUser(user); setSelectedRoom(user.room); }} />
          <ChatView user={selectedUser} room={selectedRoom} onSend={handleSend} onClear={handleClear} />
        </div>
      </div>
    </div>
  );
}
