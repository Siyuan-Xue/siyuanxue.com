import { marked, type Token, type Tokens } from 'marked';
import { decodeHTMLStrict } from 'entities/decode';

type CopyLabels = { codeCopy: string };

/** Render a fixed Markdown vocabulary with DOM creation, never HTML interpretation. */
export function renderChatMarkdown(node: HTMLElement, text: string, copy: CopyLabels): void {
  const doc = node.ownerDocument;
  const fragment = doc.createDocumentFragment();
  function render(tokens: Token[], parent: Node, depth = 0): void {
    if (depth > 40) { parent.appendChild(doc.createTextNode(tokens.map(t => t.raw).join(''))); return; }
    for (const token of tokens) {
      const element = (tag: string, children?: Token[], value?: string) => {
        const el = doc.createElement(tag);
        if (children) render(children, el, depth + 1);
        else if (value) el.textContent = value;
        parent.appendChild(el);
        return el;
      };
      switch (token.type) {
        case 'space': break;
        case 'heading': element(`h${Math.min(6, token.depth + 1)}`, token.tokens); break;
        case 'paragraph': element('p', token.tokens); break;
        case 'text':
          if (token.tokens) render(token.tokens, parent, depth + 1);
          else parent.appendChild(doc.createTextNode(decodeHTMLStrict(token.text)));
          break;
        case 'escape': parent.appendChild(doc.createTextNode(token.text)); break;
        case 'strong': element('strong', token.tokens); break;
        case 'em': element('em', token.tokens); break;
        case 'del': element('del', token.tokens); break;
        case 'codespan': element('code', undefined, token.text); break;
        case 'br': element('br'); break;
        case 'hr': element('hr'); break;
        case 'blockquote': element('blockquote', token.tokens); break;
        case 'list': {
          const list = element(token.ordered ? 'ol' : 'ul');
          if (token.ordered && token.start !== 1) list.setAttribute('start', String(token.start));
          for (const item of token.items as Tokens.ListItem[]) {
            const li = doc.createElement('li');
            if (item.task) li.appendChild(doc.createTextNode(item.checked ? '☑ ' : '☐ '));
            render(item.tokens, li, depth + 1); list.appendChild(li);
          }
          break;
        }
        case 'code': {
          const wrapper = element('div'); wrapper.className = 'chat-code';
          const button = doc.createElement('button'); button.type = 'button';
          button.dataset.codeCopy = ''; button.setAttribute('aria-label', copy.codeCopy); button.textContent = copy.codeCopy;
          const pre = doc.createElement('pre'); const code = doc.createElement('code'); code.textContent = token.text;
          pre.appendChild(code); wrapper.append(button, pre); break;
        }
        case 'table': {
          const wrapper = element('div'); wrapper.className = 'chat-table'; wrapper.tabIndex = 0;
          const table = doc.createElement('table'); wrapper.appendChild(table);
          const row = (cells: Tokens.TableCell[], tag: 'th' | 'td', group: HTMLElement) => {
            const tr = doc.createElement('tr');
            for (const cell of cells) { const td = doc.createElement(tag); if (tag === 'th') td.setAttribute('scope', 'col'); render(cell.tokens, td, depth + 1); tr.appendChild(td); }
            group.appendChild(tr);
          };
          const head = doc.createElement('thead'); row(token.header, 'th', head); table.appendChild(head);
          const body = doc.createElement('tbody'); for (const cells of token.rows) row(cells, 'td', body); table.appendChild(body); break;
        }
        case 'link': {
          // Only explicitly safe protocols or same-site root/hash links; reject protocol-relative URLs.
          // Markdown requires a semicolon on character references. Decode once before validation.
          const href = decodeHTMLStrict(token.href);
          if (!/[\u0000-\u001f\u007f]/.test(href) && (/^(https?:\/\/|mailto:)/i.test(href) || /^(\/(?![\/\\])|#)/.test(href))) {
            const link = element('a', token.tokens);
            link.setAttribute('href', href);
            if (token.title) link.setAttribute('title', decodeHTMLStrict(token.title));
            if (/^https?:/i.test(href)) { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener noreferrer'); }
          } else render(token.tokens ?? [], parent, depth + 1);
          break;
        }
        case 'image': parent.appendChild(doc.createTextNode(decodeHTMLStrict(token.text))); break;
        case 'html': parent.appendChild(doc.createTextNode(token.raw)); break;
        default: parent.appendChild(doc.createTextNode(token.raw));
      }
    }
  }
  try { render(marked.lexer(text, { gfm: true }), fragment); }
  catch { fragment.replaceChildren(doc.createTextNode(text)); }
  node.replaceChildren(fragment);
}

export async function copyChatText(text: string, clipboard: Pick<Clipboard, 'writeText'> | undefined): Promise<boolean> {
  try { if (!clipboard) return false; await clipboard.writeText(text); return true; }
  catch { return false; }
}
