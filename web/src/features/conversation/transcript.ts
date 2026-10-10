import type { GatewayEvent, GatewayEventName, TranscriptMessage } from '@hermes/shared';

export interface ConversationState {
  messages: TranscriptMessage[];
  streaming: string;
  busy: boolean;
  status: string;
  error: string;
}
export const emptyConversation: ConversationState = {
  messages: [], streaming: '', busy: false, status: '', error: '',
};

type ConversationEvent = { [K in GatewayEventName]: GatewayEvent<K> }[GatewayEventName];

export function reduceConversation(state: ConversationState, input: GatewayEvent): ConversationState {
  const event = input as ConversationEvent;
  switch (event.type) {
    case 'message.start':
      return { ...state, busy: true, error: '' };
    case 'message.delta':
      return { ...state, busy: true, streaming: state.streaming + (event.payload?.text ?? '') };
    case 'message.interim': {
      const text = event.payload?.text || state.streaming;
      return { ...state, streaming: '', messages: text ? [...state.messages, { role: 'assistant', text }] : state.messages };
    }
    case 'message.complete': {
      const payload = event.payload;
      const text = typeof payload?.text === 'string' ? payload.text : state.streaming;
      return { ...state, streaming: '', busy: false, status: '', error: payload?.error ?? '',
        messages: text ? [...state.messages, { role: 'assistant', text, reasoning: payload?.reasoning }] : state.messages };
    }
    case 'tool.start':
      return { ...state, status: `يستخدم ${event.payload?.name ?? 'أداة'}`,
        messages: [...state.messages, { role: 'tool', text: '', name: event.payload?.name,
          tool_call_id: event.payload?.tool_id, args: event.payload?.args }] };
    case 'tool.complete': {
      const payload = event.payload;
      return { ...state, status: '', messages: state.messages.map(row =>
        row.role === 'tool' && row.tool_call_id === payload?.tool_id
          ? { ...row, text: payload?.result_text || payload?.summary || JSON.stringify(payload?.result ?? ''), complete: true }
          : row) };
    }
    case 'status.update':
      return { ...state, status: event.payload?.text ?? '' };
    case 'error':
      return { ...state, error: event.payload?.message ?? 'تعذر إتمام الطلب', busy: false };
    default:
      return state;
  }
}
