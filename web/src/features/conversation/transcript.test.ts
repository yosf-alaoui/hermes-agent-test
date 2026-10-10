import { describe, it, expect } from 'vitest';
import { emptyConversation, reduceConversation } from './transcript';

describe('conversation transcript', () => {
  it('seals streamed commentary once and keeps the final reply separate from tool output', () => {
    let state = reduceConversation(emptyConversation, { type: 'message.delta', payload: { text: 'سأراجع الملف' } });
    state = reduceConversation(state, { type: 'message.interim', payload: { text: 'سأراجع الملف', already_streamed: true } });
    state = reduceConversation(state, { type: 'tool.start', payload: { tool_id: 'read-1', name: 'read_file', args: { path: 'README.md' } } });
    state = reduceConversation(state, { type: 'tool.complete', payload: { tool_id: 'read-1', name: 'read_file', result_text: '# Project' } });
    state = reduceConversation(state, { type: 'message.delta', payload: { text: 'الملف موجود' } });
    state = reduceConversation(state, { type: 'message.complete', payload: { text: 'الملف موجود', status: 'complete' } });
    expect(state.messages.map(row => [row.role, row.text])).toEqual([
      ['assistant', 'سأراجع الملف'], ['tool', '# Project'], ['assistant', 'الملف موجود'],
    ]);
    expect(state.streaming).toBe('');
    expect(state.busy).toBe(false);
  });
  it('retains partial Arabic text on interruption and surfaces failures without erasing history', () => {
    const before = { ...emptyConversation, messages: [{ role: 'user', text: 'شرح لي' }] };
    let state = reduceConversation(before, { type: 'message.delta', payload: { text: 'أكيد، ' } });
    state = reduceConversation(state, { type: 'message.complete', payload: { status: 'interrupted', error: 'interrupted' } });
    expect(state.messages.map(row => row.text)).toEqual(['شرح لي', 'أكيد، ']);
    expect(state.error).toBe('interrupted');
    expect(state.busy).toBe(false);
  });
});
