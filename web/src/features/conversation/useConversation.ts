import { useEffect, useRef, useState } from 'react';
import { type ConnectionState,
  type ServerRequest, type SessionCreateResult, type SessionResumeResult,
  type SessionLiveInfo, type SlashExecResult, type FileAttachResult } from '@hermes/shared';
import { GatewayClient } from '@/lib/gatewayClient';
import { emptyConversation, reduceConversation } from './transcript';

export function useConversation(profile: string, resume: string, nonce: number, cwd: string, enabled: boolean) {
  const client = useRef<GatewayClient | null>(null);
  const sid = useRef('');
  const stored = useRef(resume);
  const routeKey = `${profile}:${resume}:${nonce}`;
  const previousRoute = useRef('');
  const [state, setState] = useState(emptyConversation);
  const [info, setInfo] = useState<SessionLiveInfo>({});
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [requests, setRequests] = useState<ServerRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const fail = (e: unknown) => setState(previous => ({ ...previous, busy: false,
    error: e instanceof Error ? e.message : String(e) }));

  useEffect(() => {
    if (!enabled) return;
    const gateway = new GatewayClient();
    client.current = gateway;
    sid.current = '';
    const changedRoute = previousRoute.current !== routeKey;
    previousRoute.current = routeKey;
    if (changedRoute) {
      stored.current = resume;
      if (!resume && nonce === 0) {
        try { stored.current = sessionStorage.getItem(`hermes-conversation:${profile}`) || ''; } catch { /* Browser storage may be unavailable. */ }
      }
      if (!resume && nonce > 0) {
        try { sessionStorage.removeItem(`hermes-conversation:${profile}`); } catch { /* Optional reload continuity. */ }
      }
    }
    let disposed = false;
    const earlyRequests: ServerRequest[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (changedRoute) setState(emptyConversation);
    setRequests([]);
    setInfo({});
    setLoading(Boolean(stored.current));
    gateway.onState(next => {
      if (disposed) return;
      setConnection(next);
      if (next === 'closed' || next === 'error') {
        setLoading(false);
        timer = setTimeout(() => setRetry(n => n + 1), 3000);
      }
    });
    gateway.onEvent(event => {
      if (disposed || event.session_id !== sid.current) return;

      setState(previous => reduceConversation(previous, event));
    });
    gateway.on('session.info', event => {
      if (!disposed && event.session_id === sid.current) setInfo(previous => ({ ...previous, ...event.payload }));
    });
    gateway.on('request.cancel', event => {
      if (!disposed) setRequests(previous => previous.filter(r => r.id !== event.payload?.id));
    });
    gateway.onRequest(request => {
      if (!sid.current) { earlyRequests.push(request); return true; }
      if (request.params.session_id !== sid.current) return false;
      setRequests(previous => [...previous.filter(r => r.id !== request.id), request]);
      return true;
    });
    async function connect() {
      if (disposed) return;
      await gateway.connect();
      await gateway.request('client.capabilities', { server_requests: true });
      if (!stored.current) { setLoading(false); return; }
      const result = await gateway.request<SessionResumeResult>('session.resume', {
        session_id: stored.current, profile: profile || undefined, source: 'web', lazy: true,
        close_on_disconnect: false,
      });
      if (disposed) return;
      sid.current = result.session_id;
      setRequests(earlyRequests.filter(request => request.params.session_id === sid.current));
      stored.current = result.stored_session_id || stored.current;
      try { sessionStorage.setItem(`hermes-conversation:${profile}`, stored.current); } catch { /* The SQLite history is still durable. */ }
      setInfo({ ...result.info, stored_session_id: stored.current });
      const messages = [...result.messages];
      const lastUser = messages.filter(row => row.role === 'user').at(-1);
      if (result.inflight?.user && lastUser?.text !== result.inflight.user) messages.push({ role: 'user', text: result.inflight.user });
      setState({ ...emptyConversation, messages, busy: Boolean(result.running),
        streaming: result.inflight?.assistant || '', error: result.inflight?.error || '' });
      for (const entry of result.open_requests ?? []) {
        const request: ServerRequest = { ...entry, respond: answer => {
          void gateway.request('request.answer', { id: entry.id, result: answer, profile }).catch(fail);
        }, fail: () => {} };
        setRequests(previous => [...previous.filter(r => r.id !== entry.id), request]);
      }
      setLoading(false);
    }
    void connect().catch(e => { if (!disposed) { setLoading(false); fail(e); } });
    return () => { disposed = true; clearTimeout(timer); gateway.close(); };
  // Workspace is read only at session creation; changing it never rebuilds an existing conversation.
  }, [profile, resume, nonce, retry, enabled, routeKey]);

  async function ensureSession() {
    const gateway = client.current;
    if (!gateway || gateway.connectionState !== 'open') throw new Error('انتظر اتصال المساعد ثم أعد المحاولة');
    if (!sid.current) {
      const result = await gateway.request<SessionCreateResult>('session.create', {
        profile: profile || undefined, source: 'web', cwd: cwd || undefined, close_on_disconnect: false,
      });
      sid.current = result.session_id;
      stored.current = result.stored_session_id;
      try { sessionStorage.setItem(`hermes-conversation:${profile}`, stored.current); } catch { /* The SQLite history is still durable. */ }
      setInfo({ ...result.info, stored_session_id: stored.current });
    }
    return { gateway, session_id: sid.current };
  }

  async function send(text: string) {
    setState(previous => ({ ...previous, error: '', busy: true }));
    try {
      const { gateway, session_id } = await ensureSession();
      let body = text;
      if (text.startsWith('/')) {
        const result = await gateway.request<SlashExecResult>('slash.exec', { session_id, profile, command: text.slice(1) });
        if (result.type === 'send' || result.type === 'skill') body = result.message || text;
        else {
          setState(previous => ({ ...previous, busy: false, messages: [...previous.messages,
            { role: 'system', text: result.output || result.notice || result.warning || 'استعمل عرض الطرفية لهذا الأمر.' }] }));
          return true;
        }
      }
      setState(previous => ({ ...previous, messages: [...previous.messages, { role: 'user', text }], streaming: '' }));
      await gateway.request('prompt.submit', { session_id, profile, text: body });
      return true;
    } catch (e) { fail(e); return false; }
  }
  async function stop() {
    try { await client.current?.request('session.interrupt', { session_id: sid.current, profile }); }
    catch (e) { fail(e); }
  }
  async function attach(file: File) {
    const { gateway, session_id } = await ensureSession();
    const data_url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const result = await gateway.request<FileAttachResult>('file.attach', { session_id, profile, data_url, name: file.name });
    if (file.type.startsWith('image/')) await gateway.request('image.attach', { session_id, profile, path: result.path });
    return result;
  }
  function answer(request: ServerRequest, result: Record<string, unknown>) {
    request.respond(result);
    setRequests(previous => previous.filter(r => r.id !== request.id));
  }
  return { state, info, connection, loading, requests, send, stop, attach, answer,
    reconnect: () => setRetry(n => n + 1), storedId: info.stored_session_id || resume };
}
