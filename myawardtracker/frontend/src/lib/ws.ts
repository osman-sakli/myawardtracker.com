/**
 * Minimal WebSocket client for org chat.
 *
 * Authentication is a Cognito JWT passed as ?token=... on connect — the
 * Lambda validates it server-side. We also pass orgId + channelId so the
 * server can pre-subscribe the connection for fan-out.
 *
 * The hook handles reconnect with exponential backoff. If the env var
 * NEXT_PUBLIC_WS_URL is empty (no WS API deployed), the hook silently
 * no-ops and the calling page should fall back to HTTP polling.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import { getAuthToken } from './auth';
import { env } from './env';
import type { ChatMessage } from './types';

interface UseChatSocketArgs {
  orgId: string;
  channelId: string;
  onMessage: (msg: ChatMessage) => void;
}

export function useChatSocket({ orgId, channelId, onMessage }: UseChatSocketArgs) {
  const [connected, setConnected] = useState(false);
  const sockRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!env.wsUrl || !orgId || !channelId) return undefined;
    let active = true;
    let retry = 0;

    const open = async () => {
      const token = await getAuthToken();
      if (!token || !active) return;
      const url = `${env.wsUrl}/prod?token=${encodeURIComponent(token)}&orgId=${orgId}&channelId=${channelId}`;
      const sock = new WebSocket(url);
      sockRef.current = sock;

      sock.onopen = () => {
        setConnected(true);
        retry = 0;
      };
      sock.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.type === 'message' && payload.message) {
            onMessageRef.current(payload.message as ChatMessage);
          }
        } catch {
          /* swallow malformed frames */
        }
      };
      sock.onclose = () => {
        setConnected(false);
        if (!active) return;
        const delay = Math.min(15000, 1000 * 2 ** retry);
        retry += 1;
        setTimeout(open, delay);
      };
      sock.onerror = () => sock.close();
    };

    open();
    return () => {
      active = false;
      sockRef.current?.close();
    };
  }, [orgId, channelId]);

  const send = (body: string) => {
    const sock = sockRef.current;
    if (!sock || sock.readyState !== sock.OPEN) return false;
    sock.send(
      JSON.stringify({ action: 'sendmessage', orgId, channelId, body }),
    );
    return true;
  };

  return { connected, send };
}
