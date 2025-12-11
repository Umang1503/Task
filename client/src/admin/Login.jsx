import React, { useState } from 'react';

export default function Login({onLogin}){
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [key, setKey] = useState('');

  const submit = (e)=>{
    e.preventDefault();
    // hardcoded credentials
    // allow admin key or username/password
    const envKey = (window?.APP_CONFIG && window.APP_CONFIG.ADMIN_KEY) || '';
    if(key && envKey && key === envKey){
      return onLogin({ username: 'admin' });
    }
    if(user === 'admin' && pass === 'admin123'){
      return onLogin({username: 'admin'});
    }
    setErr('Invalid credentials or key');
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Admin Login</h2>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input value={user} onChange={e=>setUser(e.target.value)} placeholder="username" className="border p-2 rounded" />
        <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="password" type="password" className="border p-2 rounded" />
        <div className="text-sm text-gray-500">Or enter admin key</div>
        <input value={key} onChange={e=>setKey(e.target.value)} placeholder="admin key" className="border p-2 rounded" />
        <button className="bg-blue-600 text-white px-3 py-1 rounded">Login</button>
        {err && <div className="text-red-500 text-sm">{err}</div>}
      </form>
    </div>
  );
}
