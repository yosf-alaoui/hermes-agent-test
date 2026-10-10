import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router';
import { createPortal } from 'react-dom';
import { ArrowUp, Check, ChevronDown, Copy, Menu, Paperclip, Plus, Settings, Square, X, Sparkles, PanelLeftClose, Terminal } from 'lucide-react';
import { ChatSessionList } from '@/components/ChatSessionList';
import { Markdown } from '@/components/Markdown';
import { useProfileScope } from '@/contexts/useProfileScope';
import { copyTextToClipboard } from '@/lib/clipboard';
import { readStoredWorkspace, writeStoredWorkspace } from '@/lib/chat-workspaces';
import { useConversation } from '@/features/conversation/useConversation';
import { RequestCard } from '@/features/conversation/RequestCard';
import type { TranscriptMessage } from '@hermes/shared';
import '@/features/conversation/conversation.css';
const TerminalChat = lazy(() => import('./ChatPage'));

function Message({ row }: { row: TranscriptMessage }) {
  const [copied, setCopied] = useState(false);
  const text = row.text || (typeof row.content === 'string' ? row.content : '');
  if (row.display_kind === 'hidden') return null;
  if (row.role === 'tool') return <details className="conversation-tool">
    <summary>{row.complete || text ? <Check size={14} /> : <span className="working-dot" />} {row.name || 'أداة'} <ChevronDown size={14} /></summary>
    {row.args ? <pre dir="ltr">{JSON.stringify(row.args, null, 2)}</pre> : null}
    <pre dir="auto">{text || 'جارٍ التنفيذ…'}</pre>
  </details>;
  if (!text) return null;
  return <article className={`conversation-message ${row.role === 'user' ? 'from-user' : 'from-assistant'}`}>
    {row.role === 'user' ? <div className="user-bubble" dir="auto">{text}</div> : <>
      {row.reasoning ? <details className="conversation-tool"><summary>التفكير <ChevronDown size={14} /></summary><div dir="auto">{row.reasoning}</div></details> : null}
      <div className="conversation-prose" dir="auto"><Markdown content={text} /></div>
      <button className="message-copy" aria-label="نسخ الرسالة" onClick={() => {
        void copyTextToClipboard(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
      }}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
    </>}
  </article>;
}

export default function ConversationPage({ isActive = true }: { isActive?: boolean }) {
  const [params, setParams] = useSearchParams();
  if (params.get('view') === 'terminal') return <Suspense fallback={<p>Loading…</p>}>
    <div className="terminal-return"><button onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete('view'); return next; })}>العودة إلى المحادثة</button></div>
    <TerminalChat isActive={isActive} />
  </Suspense>;
  return <ConversationSurface isActive={isActive} />;
}

function ConversationSurface({ isActive }: { isActive: boolean }) {
  const { profile } = useProfileScope();
  const [params, setParams] = useSearchParams();
  const resume = params.get('resume') || '';
  const [nonce, setNonce] = useState(0);
  const [workspace, setWorkspace] = useState(() => readStoredWorkspace(profile));
  const [activated, setActivated] = useState(isActive);
  const chat = useConversation(profile, resume, nonce, workspace, activated);
  const [draft, setDraft] = useState('');
  const [sidebar, setSidebar] = useState(() => window.innerWidth >= 900);
  const [settings, setSettings] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const app = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isActive) setActivated(true); }, [isActive]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!isActive || !viewport) return;
    const resize = () => {
      if (!app.current) return;
      app.current.style.height = `${viewport.height}px`;
      app.current.style.top = `${viewport.offsetTop}px`;
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => { viewport.removeEventListener('resize', resize); viewport.removeEventListener('scroll', resize); };
  }, [isActive]);
  useEffect(() => { if (pinned.current) scroll.current?.scrollTo({ top: scroll.current.scrollHeight }); }, [chat.state.messages, chat.state.streaming, chat.requests]);
  useEffect(() => { if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.min(input.current.scrollHeight, 180)}px`; } }, [draft]);
  const disabled = chat.loading || chat.connection !== 'open' || sending || attaching;
  async function submit() {
    if (!draft.trim() || disabled || chat.state.busy) return;
    setSending(true);
    const text = draft;
    const success = await chat.send(text);
    if (success) { setDraft(current => current === text ? '' : current); setAttachments([]); }
    pinned.current = true;
    setSending(false);
  }
  function newChat() {
    if (chat.state.busy || sending || attaching) return;
    setParams(previous => { const next = new URLSearchParams(previous); next.delete('resume'); return next; });
    setNonce(n => n + 1);
    setDraft(''); setAttachments([]); setAttachmentError(''); pinned.current = true;
    input.current?.focus();
  }
  async function upload(files: FileList | null) {
    if (!files || disabled || chat.state.busy) return;
    setAttaching(true); setAttachmentError('');
    try {
      for (const file of Array.from(files)) {
        const result = await chat.attach(file);
        setDraft(previous => `${previous}${previous ? '\n' : ''}${result.ref_text}`);
        setAttachments(previous => [...previous, file.name]);
      }
    } catch (e) { setAttachmentError(e instanceof Error ? e.message : String(e)); }
    finally { setAttaching(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  return createPortal(<div ref={app} className="conversation-app" hidden={!isActive}>
    {sidebar ? <button className="conversation-scrim" aria-label="إغلاق القائمة" onClick={() => setSidebar(false)} /> : null}
    <aside className={`conversation-sidebar ${sidebar ? 'is-open' : ''}`} aria-label="المحادثات">
      <div className="conversation-brand"><span className="brand-mark"><Sparkles size={19} /></span><strong>My Agent</strong><button aria-label="إغلاق القائمة" onClick={() => setSidebar(false)}><PanelLeftClose size={19} /></button></div>
      <button className="new-conversation" disabled={chat.state.busy || sending || attaching} onClick={newChat}><Plus size={18} /> محادثة جديدة</button>
      <div className="conversation-history" inert={chat.state.busy || sending || attaching}><ChatSessionList activeSessionId={resume || chat.storedId || null} profile={profile}
        isActive={isActive} onNewChat={newChat} onPicked={() => { setDraft(''); setAttachments([]); setAttachmentError(''); pinned.current = true; if (window.innerWidth < 900) setSidebar(false); }} /></div>
      <nav className="conversation-nav"><Link to="/files"><Paperclip size={17} /> الملفات</Link><Link to="/skills"><Sparkles size={17} /> المهارات</Link><Link to="/config"><Settings size={17} /> الإعدادات</Link></nav>
      <div className="conversation-profile"><span>Y</span><div><strong>مساعدك الشخصي</strong><small>على جهازك · My Agent</small></div></div>
    </aside>
    <main className="conversation-main">
      <header className="conversation-header"><div>{!sidebar ? <button aria-label="فتح قائمة المحادثات" onClick={() => setSidebar(true)}><Menu size={21} /></button> : null}
        <button className="conversation-model" onClick={() => setSettings(v => !v)}>My Agent <ChevronDown size={16} /></button></div>
        <div><span className={`connection-dot ${chat.connection === 'open' ? 'connected' : ''}`} title={chat.connection === 'open' ? 'متصل' : 'جارٍ الاتصال'} /><button aria-label="خيارات المحادثة" onClick={() => setSettings(v => !v)}><Settings size={20} /></button></div></header>
      {settings ? <section className="conversation-settings" dir="rtl"><button className="settings-close" aria-label="إغلاق الخيارات" onClick={() => setSettings(false)}><X size={18} /></button>
        <strong>خيارات المحادثة</strong><p dir="ltr">{chat.info.model || 'النموذج المحدد في الإعدادات'}</p>
        <p>النموذج المحلي · {chat.info.personality || 'project-assistant'}</p>
        <label>مجلد المحادثات الجديدة<input dir="ltr" value={workspace} onChange={e => { setWorkspace(e.target.value); writeStoredWorkspace(profile, e.target.value); }} placeholder="مجلد المشروع الافتراضي" /></label>
        <Link to="/models">اختيار النموذج</Link><Link to="/sessions">إدارة وتصدير المحادثات</Link>
        <button onClick={() => { const next = new URLSearchParams(params); next.set('view', 'terminal'); if (chat.storedId) next.set('resume', chat.storedId); setParams(next); }}><Terminal size={16} /> عرض الطرفية والأوامر المتقدمة</button>
      </section> : null}
      <div className="conversation-scroll" ref={scroll} onScroll={() => { const el = scroll.current; if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
        <ConversationTimeline chat={chat} onSuggestion={text => { setDraft(text); input.current?.focus(); }} />
      </div>
      <ConversationComposer chat={chat} attachmentError={attachmentError} attachments={attachments}
        attaching={attaching} disabled={disabled} draft={draft} setDraft={setDraft} submit={submit}
        upload={upload} input={input} fileInput={fileInput} />
    </main>
  </div>, document.body);
}

interface ConversationTimelineProps {
  chat: ReturnType<typeof useConversation>;
  onSuggestion: (text: string) => void;
}
function ConversationTimeline({ chat, onSuggestion }: ConversationTimelineProps) {
  const messages = chat.state.messages;
  return <>
        {!messages.length && !chat.loading ? <div className="conversation-welcome" dir="rtl"><span className="welcome-mark"><Sparkles size={30} /></span><h1>كيف يمكنني مساعدتك اليوم؟</h1><p>فكّر، اكتب، وطوّر أفكارك مع مساعدك الشخصي.</p>
          <div className="conversation-suggestions">{['ساعدني في تنظيم ملفاتي', 'طوّر معي فكرة مشروع', 'شرح لي بالدارجة المغربية'].map(text => <button key={text} onClick={() => onSuggestion(text)}>{text}<span>↗</span></button>)}</div>
        </div> : <div className="conversation-transcript">
          {chat.loading ? <p className="conversation-loading" dir="rtl">جارٍ فتح المحادثة…</p> : null}
          {messages.map((row, i) => <Message key={`${row.row_id ?? i}-${row.role}`} row={row} />)}
          {chat.state.streaming ? <article className="conversation-message from-assistant"><div className="conversation-prose" dir="auto"><Markdown content={chat.state.streaming} streaming /></div></article> : null}
          {chat.state.busy ? <div className="conversation-working" dir="rtl"><span className="working-dot" />{chat.state.status || 'المساعد يعمل…'}</div> : null}
        </div>}
  </>;
}

interface ConversationComposerProps {
  chat: ReturnType<typeof useConversation>;
  attachmentError: string;
  attachments: string[];
  attaching: boolean;
  disabled: boolean;
  draft: string;
  setDraft: (text: string) => void;
  submit: () => Promise<void>;
  upload: (files: FileList | null) => Promise<void>;
  input: React.RefObject<HTMLTextAreaElement | null>;
  fileInput: React.RefObject<HTMLInputElement | null>;
}
function ConversationComposer({ chat, attachmentError, attachments, attaching, disabled, draft, setDraft, submit, upload, input, fileInput }: ConversationComposerProps) {
  return (
      <div className="conversation-bottom"><div className="conversation-composer-wrap">
        {chat.requests.map(request => <RequestCard key={request.id} request={request} answer={chat.answer} />)}
        {chat.state.error || attachmentError ? <div className="conversation-error" role="alert" dir="auto">{chat.state.error || attachmentError}</div> : null}
        {chat.connection !== 'open' ? <div className="conversation-connection" role="status" dir="rtl">جارٍ الاتصال بالمساعد… <button onClick={chat.reconnect}>إعادة الاتصال</button></div> : null}
        <form className="conversation-composer"
          onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
          onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); void upload(e.dataTransfer.files); } }} onSubmit={e => { e.preventDefault(); void submit(); }}>
          {attachments.length ? <div className="conversation-attachments">{attachments.map((name, i) => <span key={`${name}-${i}`}><Paperclip size={13} />{name}</span>)}</div> : null}
          <textarea ref={input} dir="auto" aria-label="رسالتك" placeholder="اكتب رسالتك هنا…" value={draft} rows={1}
            onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); void upload(e.clipboardData.files); } }}
            onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} />
          <div className="composer-actions"><div><button type="button" aria-label="إرفاق ملف" disabled={disabled || chat.state.busy} onClick={() => fileInput.current?.click()}><Plus size={22} /></button><span>{attaching ? 'جارٍ إرفاق الملف…' : 'My Agent'}</span></div>
            {chat.state.busy ? <button className="composer-send" type="button" aria-label="إيقاف الرد" onClick={() => { void chat.stop(); }}><Square size={16} fill="currentColor" /></button>
              : <button className="composer-send" type="submit" aria-label="إرسال الرسالة" disabled={disabled || !draft.trim()}><ArrowUp size={21} /></button>}</div>
          <input ref={fileInput} type="file" multiple hidden onChange={e => { void upload(e.target.files); }} />
        </form><p className="conversation-footnote" dir="rtl">قد يخطئ المساعد. راجع المعلومات المهمة.</p>
      </div></div>
  );
}
