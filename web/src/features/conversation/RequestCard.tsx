import { useState } from 'react';
import type { ServerRequest, ClarifyQuestion } from '@hermes/shared';
interface RequestCardProps {
  request: ServerRequest;
  answer: (request: ServerRequest, result: Record<string, unknown>) => void;
}
export function RequestCard({ request, answer }: RequestCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const params = request.params;
  if (request.method === 'approval') {
    const choices = Array.isArray(params.choices) ? params.choices as string[] : ['once', 'deny'];
    const labels: Record<string, string> = { once: 'السماح مرة واحدة', session: 'السماح لهذه المحادثة', always: 'السماح دائمًا', deny: 'رفض' };
    return <section className="conversation-request" dir="rtl">
      <strong>المساعد يحتاج موافقتك</strong>
      <p>{String(params.description || params.tool_name || '')}</p>
      {params.command ? <pre dir="ltr">{String(params.command)}</pre> : null}
      <div className="request-actions">{choices.map(choice => <button key={choice}
        onClick={() => answer(request, { choice })}>{labels[choice] || choice}</button>)}</div>
    </section>;
  }
  if (request.method === 'clarify') {
    const questions = params.questions as ClarifyQuestion[];
    return <form className="conversation-request" dir="rtl" onSubmit={e => { e.preventDefault(); answer(request, { answers }); }}>
      {questions.map(question => <label key={question.qid}>
        <strong>{question.question}</strong>
        {question.choices?.length ? <div className="request-actions">{question.choices.map(choice =>
          <button type="button" key={choice} aria-pressed={answers[question.qid]?.split('\n').includes(choice)}
            onClick={() => setAnswers(previous => {
              const selected = previous[question.qid]?.split('\n') || [];
              const value = question.multi_select
                ? (selected.includes(choice) ? selected.filter(item => item !== choice) : [...selected, choice]).join('\n') : choice;
              return { ...previous, [question.qid]: value };
            })}>{choice}</button>)}</div> : null}
        <input value={answers[question.qid] || ''} onChange={e => setAnswers(previous => ({ ...previous, [question.qid]: e.target.value }))} placeholder="اكتب إجابتك" />
      </label>)}
      <div className="request-actions"><button type="submit">إرسال الإجابات</button><button type="button" onClick={() => answer(request, {})}>إلغاء</button></div>
    </form>;
  }
  return <section className="conversation-request" dir="rtl"><strong>طلب إضافي: {request.method}</strong>
    <p>استخدم عرض الطرفية لإكمال هذا النوع من الطلبات.</p>
    <button onClick={() => answer(request, { value: '' })}>تخطي</button></section>;
}
