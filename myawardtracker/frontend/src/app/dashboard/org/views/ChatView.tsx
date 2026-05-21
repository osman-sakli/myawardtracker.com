'use client';

import { Hash, MessageSquare, Plus, Send, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useOrgContext } from '@/components/dashboard/OrgContext';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ErrorState, LoadingState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { env } from '@/lib/env';
import { formatDateTime, initials, relativeTime } from '@/lib/format';
import { roleHas } from '@/lib/rbac';
import type { ChatMessage, Channel } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';
import { useChatSocket } from '@/lib/ws';

export function ChatView() {
  const { org, role } = useOrgContext();
  const channels = useAsync(() => api.listChannels(org.id));
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canPost = roleHas(role, 'messages:post');
  const canCreateChannel = roleHas(role, 'channels:create');

  // Pick the first channel once they load.
  useEffect(() => {
    if (!activeChannelId && channels.data?.channels.length) {
      setActiveChannelId(channels.data.channels[0].id);
    }
  }, [channels.data, activeChannelId]);

  if (channels.loading) return <LoadingState />;
  if (channels.error || !channels.data) {
    return (
      <ErrorState
        message={channels.error ?? 'Failed to load channels.'}
        onRetry={channels.reload}
      />
    );
  }

  const channelList = channels.data.channels;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team chat"
        description={`Messages auto-delete after ${org.chatRetentionDays} days — keep this for conversations, not records.`}
        action={
          canCreateChannel ? (
            <Button onClick={() => setCreateOpen(true)} variant="secondary">
              <Plus className="h-4 w-4" />
              New channel
            </Button>
          ) : null
        }
      />

      {channelList.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No channels yet"
          description={
            canCreateChannel
              ? 'Create your first channel to start the conversation.'
              : 'Ask an admin or manager to create the first channel.'
          }
          action={
            canCreateChannel ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create channel
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <Card className="p-2">
            <ul className="space-y-1">
              {channelList.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(c.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                      activeChannelId === c.id
                        ? 'bg-brand/10 font-medium text-content'
                        : 'text-content-muted hover:bg-surface-hover hover:text-content',
                    )}
                  >
                    <Hash className="h-4 w-4" />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {activeChannelId && (
            <ChannelView
              key={activeChannelId}
              orgId={org.id}
              channel={
                channelList.find((c) => c.id === activeChannelId) ?? channelList[0]
              }
              canPost={canPost}
            />
          )}
        </div>
      )}

      {canCreateChannel && (
        <CreateChannelModal
          open={createOpen}
          orgId={org.id}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCreateOpen(false);
            channels.reload();
            setActiveChannelId(c.id);
          }}
        />
      )}
    </div>
  );
}

function ChannelView({
  orgId,
  channel,
  canPost,
}: {
  orgId: string;
  channel: Channel;
  canPost: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const append = (msg: ChatMessage) => {
    setMessages((prev) => {
      if (!prev) return [msg];
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const { connected, send } = useChatSocket({
    orgId,
    channelId: channel.id,
    onMessage: append,
  });

  // Polling fallback: only when no WebSocket URL is configured.
  useEffect(() => {
    if (env.wsUrl) return undefined;
    const id = setInterval(async () => {
      try {
        const res = await api.listMessages(orgId, channel.id);
        setMessages(res.messages);
      } catch {
        /* keep the last good list on transient errors */
      }
    }, 15000);
    return () => clearInterval(id);
  }, [orgId, channel.id]);

  // Initial load.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .listMessages(orgId, channel.id)
      .then((res) => {
        if (!active) return;
        setMessages(res.messages);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load messages.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [orgId, channel.id]);

  // Auto-scroll to the bottom when messages change.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);

    // Optimistic via WebSocket; fall back to HTTP.
    const wsSent = send(body);
    if (!wsSent) {
      try {
        const res = await api.postMessage(orgId, channel.id, body);
        append(res.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send message.');
        setSending(false);
        return;
      }
    }
    setDraft('');
    setSending(false);
  };

  return (
    <Card className="flex h-[68vh] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-content">
            <Hash className="h-4 w-4 text-content-subtle" />
            {channel.name}
          </p>
          {channel.description && (
            <p className="truncate text-xs text-content-muted">{channel.description}</p>
          )}
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs',
            connected ? 'text-success' : 'text-content-subtle',
          )}
          title={env.wsUrl ? 'WebSocket status' : 'WebSocket disabled — polling every 15s'}
        >
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {env.wsUrl ? (connected ? 'Live' : 'Reconnecting…') : 'Polling'}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-sm text-content-muted">Loading messages…</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : messages && messages.length > 0 ? (
          messages.map((m) => <MessageRow key={m.id} message={m} />)
        ) : (
          <p className="text-sm text-content-muted">
            No messages yet. Say hi!
          </p>
        )}
      </div>

      {canPost ? (
        <form
          onSubmit={submit}
          className="flex items-end gap-2 border-t border-border bg-bg-soft p-3"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message #${channel.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="min-h-[44px] resize-none"
            maxLength={4000}
          />
          <Button type="submit" loading={sending} disabled={!draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <div className="border-t border-border bg-bg-soft px-5 py-3 text-xs text-content-subtle">
          Your role can read this channel but not post.
        </div>
      )}
    </Card>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-semibold text-brand">
        {initials(message.authorName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-content">{message.authorName}</span>
          <span
            className="text-[11px] text-content-subtle"
            title={formatDateTime(message.createdAt)}
          >
            {relativeTime(message.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-content">
          {message.body}
        </p>
      </div>
    </div>
  );
}

function CreateChannelModal({
  open,
  orgId,
  onClose,
  onCreated,
}: {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onCreated: (c: Channel) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.createChannel(orgId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast(`Created #${res.channel.name}`, 'success');
      setName('');
      setDescription('');
      onCreated(res.channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create channel.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Create channel">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Channel name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="general"
            required
            maxLength={80}
          />
        </FormField>
        <FormField label="Description" hint="Optional. Shown at the top of the channel.">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={400}
          />
        </FormField>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
