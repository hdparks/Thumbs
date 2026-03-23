import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

export function usePeer(roomId) {
  const [peerId, setPeerId] = useState(null);
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const isHost = !roomId;
  const peerRef = useRef(null);
  const dataCallbackRef = useRef(null);
  const connRef = useRef(null);

  console.log('[usePeer] roomId:', roomId, 'isHost:', isHost);

  useEffect(() => {
    const peer = new Peer(undefined, {
      debug: 2,
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('[PeerJS] Open with ID:', id);
      setPeerId(id);
    });

    peer.on('error', (err) => {
      console.error('[PeerJS] Error:', err);
      setError(err.message);
    });

    peer.on('disconnected', () => {
      console.log('[PeerJS] Disconnected');
    });

    peer.on('connection', (conn) => {
      console.log('[PeerJS] Incoming connection from:', conn.peer);
      setRemotePeerId(conn.peer);
      
      conn.on('open', () => {
        console.log('[PeerJS] Connection opened');
        setConnected(true);
      });

      conn.on('data', (data) => {
        console.log('[PeerJS] Data:', data);
        if (dataCallbackRef.current) {
          dataCallbackRef.current(data);
        }
      });

      conn.on('close', () => {
        console.log('[PeerJS] Connection closed');
        setConnected(false);
      });

      conn.on('error', (err) => {
        console.error('[PeerJS] Connection error:', err);
        setError(err.message);
      });
    });

    return () => {
      peer.destroy();
      peerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!peerId || !roomId || isHost) return;

    console.log('[client] Connecting to host:', roomId);
    
    const conn = peerRef.current.connect(roomId);
    connRef.current = conn;
    setRemotePeerId(roomId);

    conn.on('open', () => {
      console.log('[PeerJS] Connection opened');
      setConnected(true);
    });

    conn.on('data', (data) => {
      console.log('[PeerJS] Data:', data);
      if (dataCallbackRef.current) {
        dataCallbackRef.current(data);
      }
    });

    conn.on('close', () => {
      console.log('[PeerJS] Connection closed');
      setConnected(false);
    });

    conn.on('error', (err) => {
      console.error('[PeerJS] Connection error:', err);
      setError(err.message);
    });
  }, [peerId, roomId, isHost]);

  const sendData = useCallback((data) => {
    const peer = peerRef.current;
    if (!peer) return false;

    if (isHost) {
      const conns = Object.values(peer.connections).flat();
      if (conns.length > 0) {
        conns[0].send(data);
        return true;
      }
    } else {
      const conn = connRef.current;
      if (conn?.open) {
        conn.send(data);
        return true;
      }
    }
    return false;
  }, [isHost, roomId]);

  const onData = useCallback((callback) => {
    dataCallbackRef.current = callback;
  }, []);

  return {
    peerId,
    remotePeerId,
    connected,
    error,
    isHost,
    sendData,
    onData,
  };
}
