import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('assistant markdown', () => {
  it('renders Arabic table cells, fenced code and a copy action as separate blocks', () => {
    const html = renderToStaticMarkup(<Markdown content={'| الاسم | الحالة |\n| --- | --- |\n| مشروع | جاهز |\n\n```python\nprint("مرحبا")\n```'} />);
    expect(html).toContain('<th>الاسم</th>');
    expect(html).toContain('<td>جاهز</td>');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('نسخ الكود');
  });
  it('keeps HTML and dangerous link schemes inert while rendering safe links', () => {
    const html = renderToStaticMarkup(<Markdown content={'<script>alert(1)</script> [bad](javascript:alert) [good](https://example.com)'} />);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.com"');
  });
});
