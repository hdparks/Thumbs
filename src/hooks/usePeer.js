import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

export function usePeer(roomId) {
  const [peerId, setPeerId] = useState(null);
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  
  const isHost = !roomId;
  const peerRef = useRef(null);
  const dataCallbackRef = useRef(null);
  const connRef = useRef(null);

  useEffect(() => {
    const peer = new Peer(undefined, {
      debug: 2,
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('error', (err) => {
      setError(err.message);
    });

    peer.on('disconnected', () => {
    });

    peer.on('connection', (conn) => {
      setRemotePeerId(conn.peer);
      
      conn.on('open', () => {
        setConnected(true);
      });

      conn.on('data', (data) => {
        setLastMessage(data);
        if (dataCallbackRef.current) {
          dataCallbackRef.current(data);
        }
      });

      conn.on('close', () => {
        setConnected(false);
      });

      conn.on('error', (err) => {
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

    const conn = peerRef.current.connect(roomId);
    connRef.current = conn;
    setRemotePeerId(roomId);

    conn.on('open', () => {
      setConnected(true);
    });

    conn.on('data', (data) => {
      setLastMessage(data);
      if (dataCallbackRef.current) {
        dataCallbackRef.current(data);
      }
    });

    conn.on('close', () => {
      setConnected(false);
    });

    conn.on('error', (err) => {
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
    lastMessage,
  };
}
