import { useCallback, useEffect, useRef, useState } from 'react';
import { GameRoomClientState } from '../shared/types';

interface UseGameSocketOptions {
  code: string;
  role: 'presenter' | 'projector' | 'participant';
  token?: string;
  enabled?: boolean;
}

export function useGameSocket({
  code,
  role,
  token,
  enabled = true,
}: UseGameSocketOptions) {
  const [state, setState] = useState<GameRoomClientState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kickedMessage, setKickedMessage] = useState<string | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!enabled || !code || unmountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close();
        return;
      }
      setConnected(true);
      setError(null);
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          code: code.toUpperCase(),
          role,
          token: token || '',
        })
      );
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'state') {
          const payload = msg.payload as GameRoomClientState;
          setState(payload);
          if (payload.serverNow) {
            setClockOffsetMs(payload.serverNow - Date.now());
          }
        } else if (msg.type === 'error') {
          setError(msg.message || 'Error de conexión.');
        } else if (msg.type === 'kicked') {
          setKickedMessage(
            msg.message || 'Has sido retirado de esta partida.'
          );
          ws.close();
        }
      } catch {
        // Ignore malformed packets
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!unmountedRef.current && !kickedMessage) {
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, 1500);
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [code, role, token, enabled, kickedMessage]);

  useEffect(() => {
    unmountedRef.current = false;
    setKickedMessage(null);
    setError(null);
    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendPresenterAction = useCallback(
    (action: string, extra?: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'presenter_action',
            code: code.toUpperCase(),
            token: token || '',
            action,
            ...(extra || {}),
          })
        );
      }
    },
    [code, token]
  );

  const submitAnswer = useCallback(
    (questionIndex: number, selectedIndex: number) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'submit_answer',
            code: code.toUpperCase(),
            token: token || '',
            questionIndex,
            selectedIndex,
          })
        );
      }
    },
    [code, token]
  );

  return {
    state,
    connected,
    error,
    kickedMessage,
    clockOffsetMs,
    sendPresenterAction,
    submitAnswer,
  };
}
