import { io } from 'socket.io-client';

let socket = null;

export function connect(serverUrl, opts = {}){
  if(socket) return socket;
  try{
    socket = io(serverUrl, { autoConnect: true, reconnection: true, ...(opts || {}) });
    return socket;
  }catch(err){
    console.warn('Socket connect failed', err);
    socket = null;
    return null;
  }
}

export function on(event, cb){
  if(!socket) return;
  socket.on(event, cb);
}

export function off(event, cb){
  if(!socket) return;
  socket.off(event, cb);
}

export function emit(event, payload, ack){
  if(!socket) return;
  if(typeof ack === 'function'){
    socket.emit(event, payload, ack);
  }else{
    socket.emit(event, payload);
  }
}

export function disconnect(){
  if(!socket) return;
  socket.disconnect();
  socket = null;
}

export function isConnected(){
  return !!(socket && socket.connected);
}

export default { connect, on, off, emit, disconnect, isConnected };
