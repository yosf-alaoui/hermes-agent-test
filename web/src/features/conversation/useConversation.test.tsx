// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { ServerRequest } from '@hermes/shared';
import { useConversation } from './useConversation';
const fake = vi.hoisted(() => ({
  calls: [] as { method: string; params: Record<string, unknown> }[],
  requestHandler: null as ((request: ServerRequest) => boolean | void) | null,
}));
vi.mock('@/lib/gatewayClient', () => ({ GatewayClient: class {
  connectionState = 'open';
  async connect() {}
  close() {}
  onState(handler: (state: string) => void) { handler('open'); }
  onEvent() {}
  on() {}
  onRequest(handler: typeof fake.requestHandler) { fake.requestHandler = handler; }
  async request(method: string, params: Record<string, unknown>) {
    fake.calls.push({ method, params });
    if (method === 'session.create') return { session_id: 'runtime-1', stored_session_id: 'durable-1', messages: [], info: { model: 'test-4b' } };
    if (method === 'session.resume') return { session_id: 'runtime-2', stored_session_id: 'durable-1', messages: [{ role: 'user', text: 'مرحبا' }], info: {}, running: false };
    return {};
  }
} }));
let current: ReturnType<typeof useConversation>;
function Harness() {
  const chat = useConversation('', '', 0, '/project', true);
  useEffect(() => { current = chat; });
  return null;
}
const root = createRoot(document.createElement('div'));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { await act(async () => root.render(null)); fake.calls = []; sessionStorage.clear(); });
it('reconnects a new conversation by its durable id instead of creating another conversation', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => { await current.send('مرحبا'); });
  expect(fake.calls.filter(call => call.method === 'session.create')).toHaveLength(1);
  await act(async () => current.reconnect());
  expect(fake.calls.find(call => call.method === 'session.resume')?.params.session_id).toBe('durable-1');
  expect(current.state.messages[0].text).toBe('مرحبا');
  expect(fake.calls.filter(call => call.method === 'session.create')).toHaveLength(1);
});
it('answers approvals only after a user choice and ignores other sessions', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => { await current.send('اختبر'); });
  const respond = vi.fn();
  const request: ServerRequest = { id: 'approval-1', method: 'approval', params: { session_id: 'runtime-1', choices: ['once', 'deny'] }, respond, fail: vi.fn() };
  await act(async () => { fake.requestHandler?.(request); });
  expect(respond).not.toHaveBeenCalled();
  expect(current.requests).toHaveLength(1);
  await act(async () => current.answer(request, { choice: 'once' }));
  expect(respond).toHaveBeenCalledWith({ choice: 'once' });
  expect(current.requests).toHaveLength(0);
  await act(async () => { fake.requestHandler?.({ ...request, id: 'other', params: { session_id: 'other-runtime' } }); });
  expect(current.requests).toHaveLength(0);
});
