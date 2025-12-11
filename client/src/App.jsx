import React, { useEffect, useState, useRef } from 'react';
import socketService from './services/socket';
import { API_SERVER } from './config';
import Login from './admin/Login';
import AdminDashboard from './admin/AdminDashboard';
import ErrorBoundary from './ErrorBoundary';
import UserLogin from './UserLogin';

function makeSessionId() {
    const existing = localStorage.getItem('aimbrill_session');
    if (existing) return existing;
    const id = 's_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('aimbrill_session', id);
    return id;
}

function getStoredDisplayName() {
    const key = 'aimbrill_name';
    return localStorage.getItem(key);
}

function MessageItem({ m }) {
    const time = new Date(m.createdAt || Date.now()).toLocaleTimeString();
    return (
        <div className={`mb-2 ${m.sender === 'admin' ? 'text-right' : 'text-left'}`}>
            <div className="inline-block bg-blue-100 px-3 py-1 rounded max-w-xs break-words">{m.text}</div>
            <div className="text-xs text-gray-400">{time}</div>
        </div>
    );
}

export default function App() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [adminOpen, setAdminOpen] = useState(false);
    const [adminUser, setAdminUser] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [userModal, setUserModal] = useState(false);
    const viewRef = useRef(null);
    const sessionId = useRef(localStorage.getItem('aimbrill_session') || makeSessionId());
    const displayName = useRef(getStoredDisplayName());
    const [userSignedIn, setUserSignedIn] = useState(false);
    const [adminSignedIn, setAdminSignedIn] = useState(false);
    // expose admin key from client config to window for Login key check
    useEffect(() => {
        try { window.APP_CONFIG = window.APP_CONFIG || {}; window.APP_CONFIG.ADMIN_KEY = (import.meta.env.VITE_ADMIN_KEY || 'dev_admin_key'); } catch (e) { }
    }, []);

    useEffect(() => {
        // load stub messages from localStorage for preview
        const key = `chat:${sessionId.current}`;
        const saved = localStorage.getItem(key);
        if (saved) setMessages(JSON.parse(saved));

        // attempt socket connection; only emit join if userSignedIn
        const s = socketService.connect(API_SERVER);
        if (s) {
            const room = `session:${sessionId.current}`;
            // join only when userSignedIn
            if (userSignedIn && displayName.current) {
                s.emit('join', { room, role: 'customer', sessionId: sessionId.current, displayName: displayName.current });
                s.emit('getHistory', room, (hist) => {
                    if (hist && Array.isArray(hist) && hist.length > 0) {
                        setMessages(hist.map(h => ({ id: h._id || h.id, text: h.text, sender: h.sender, createdAt: h.createdAt, sessionId: h.meta?.sessionId || sessionId.current, displayName: h.meta?.displayName || displayName.current })));
                    }
                });
            }
            s.on('message', (m) => setMessages(prev => {
                // dedupe: skip if same as last message
                const last = prev[prev.length - 1];
                const key = `${m.sender}|${m.text}|${new Date(m.createdAt).toISOString()}`;
                const lastKey = last ? `${last.sender}|${last.text}|${new Date(last.createdAt).toISOString()}` : null;
                if (lastKey === key) return prev;
                return [...prev, m];
            }));
            
        }
    }, []);

    useEffect(() => {
        // auto-scroll when messages change
        if (!viewRef.current) return;
        viewRef.current.scrollTop = viewRef.current.scrollHeight;
    }, [messages]);

    const send = () => {
        if (!text) return;
        if (!displayName.current) {
            // require user to set a name first
            setUserModal(true);
            return;
        }
        const msg = { id: Date.now(), text, sender: 'customer', createdAt: Date.now(), sessionId: sessionId.current };
        setText('');
        // if connected rely on server echo to append (prevents duplicates)
        if (socketService.isConnected()) {
            const room = `session:${sessionId.current}`;
            socketService.emit('message', { text: msg.text, sender: msg.sender, meta: { sessionId: sessionId.current, room, displayName: displayName.current } });
        } else {
            // persist locally for preview
            const next = [...messages, msg];
            setMessages(next);
            localStorage.setItem(`chat:${sessionId.current}`, JSON.stringify(next));
        }
    };

    const handleAdminLogin = (user) => {
        setAdminUser(user);
        setAdminSignedIn(true);
    };

    const handleSendFromAdmin = (room, msg) => {
        // emit to server if connected
        if (socketService.isConnected()) {
            socketService.emit('message', { text: msg.text, sender: 'admin', meta: { room } });
        }
    };

    const handleClearRoom = (room) => {
        if (socketService.isConnected()) {
            fetch(`/chats/${room}/clear`, { method: 'POST' }).catch(() => { });
        }
    };

    return (
        <>
            {/* floating button - hide while widget is open so only widget shows */}
            {/* show launcher only for signed-in users (widget must be accessible only after user login) */}
            {!open && userSignedIn && !adminOpen && (
                <div className="fixed bottom-6 right-6">
                    <button onClick={() => setOpen(v => !v)} className="bg-blue-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center">{open ? '×' : '💬'}</button>
                </div>
            )}
            {/* top-left controls: hide when a user is signed in or admin is signed in (only widget should remain) */}
            {!userSignedIn && !adminOpen && !adminSignedIn && (
                <div className="fixed top-6 left-6">
                    <div className="flex gap-2">
                        <button onClick={() => { setAdminOpen(true); setOpen(false); }} className="bg-gray-800 text-white px-3 py-1 rounded">Admin</button>
                        <button onClick={() => setUserModal(true)} className="bg-green-600 text-white px-3 py-1 rounded">User</button>
                    </div>
                </div>
            )}

            {open && (
                <div className="fixed bottom-20 right-6 w-80 bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="p-3 border-b flex justify-between items-center">
                        <div className="font-bold">Chat with Support</div>
                        <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-500">{displayName.current}</div>
                        </div>
                    </div>
                    <div ref={viewRef} className="h-64 p-3 overflow-auto">
                        {messages.length === 0 && <div className="text-gray-400">No messages yet. Say hi!</div>}
                        {messages.map(m => <MessageItem key={m.id} m={m} />)}
                    </div>
                    <div className="p-3 border-t flex gap-2">
                        <input value={text} onChange={e => setText(e.target.value)} className="flex-1 border rounded p-2" placeholder="Type a message..." />
                        <button onClick={send} className="bg-blue-600 text-white px-3 rounded">Send</button>
                    </div>
                </div>
            )}

            {adminOpen && (
                !adminUser ? (
                    <div className="fixed inset-0 bg-black/30 p-8">
                        <div className="max-w-md mx-auto bg-white rounded shadow-lg">
                            <Login onLogin={handleAdminLogin} />
                        </div>
                    </div>
                ) : (
                    <ErrorBoundary>
                        <AdminDashboard user={adminUser} onClose={() => { setAdminOpen(false); setAdminUser(null); setAdminSignedIn(false); }} />
                    </ErrorBoundary>
                )
            )}
            {userModal && (
                <UserLogin onSet={(res) => {
                    // res: { displayName, sessionId, room }
                    displayName.current = res.displayName;
                    sessionId.current = res.sessionId;
                    localStorage.setItem('aimbrill_name', res.displayName);
                    localStorage.setItem('aimbrill_session', res.sessionId);
                    setUserModal(false);
                    // mark user signed in and ensure admin UI is closed
                    setAdminOpen(false);
                    setAdminUser(null);
                    setAdminSignedIn(false);
                    setUserSignedIn(true);
                    setOpen(true);
                    try { if (socketService && socketService.isConnected()) { socketService.emit('join', { room: res.room, role: 'customer', sessionId: res.sessionId, displayName: res.displayName }); socketService.emit('getHistory', res.room, (hist) => { if (hist && Array.isArray(hist) && hist.length > 0) { setMessages(hist.map(h => ({ id: h._id || h.id, text: h.text, sender: h.sender, createdAt: h.createdAt, sessionId: h.meta?.sessionId || res.sessionId, displayName: h.meta?.displayName || res.displayName }))); } }); } } catch (e) { }
                }} />
            )}
        </>
    );
}
