// Editor visual (WYSIWYG) berbasis MDXEditor. Antarmuka sama dengan NoteEditor (CodeMirror):
// create(parent, doc, { onChange, onSave, onError, resolveImage }) -> { value, focus, destroy }
import React, { useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, linkPlugin,
  linkDialogPlugin, imagePlugin, tablePlugin, codeBlockPlugin, codeMirrorPlugin,
  markdownShortcutPlugin, toolbarPlugin, UndoRedo, BoldItalicUnderlineToggles, CodeToggle,
  BlockTypeSelect, ListsToggle, CreateLink, InsertTable, InsertThematicBreak, InsertCodeBlock,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

const LANGS = {
  '': 'Teks', sql: 'SQL', php: 'PHP', js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript',
  json: 'JSON', bash: 'Bash', sh: 'Shell', powershell: 'PowerShell', html: 'HTML', css: 'CSS',
  xml: 'XML', yaml: 'YAML', yml: 'YAML', python: 'Python', java: 'Java', http: 'HTTP', text: 'Teks',
  ini: 'INI', md: 'Markdown', markdown: 'Markdown', log: 'Log', diff: 'Diff',
};

// Hilangkan escape yang tidak perlu dari serializer ([[wikilink]], tanda =) di luar kode.
function clean(md) {
  const parts = md.split(/(^```[\s\S]*?^```[^\n]*$)/m);
  return parts.map((seg, i) => {
    if (i % 2 === 1) return seg;
    return seg.replace(/(`+)[\s\S]*?\1|\\([\[\]=<{}])/g, (m, _t, ch) => (ch ? ch : m)).replace(/\n{3,}/g, '\n\n');
  }).join('').replace(/[ \t]+$/gm, '');
}

// MDX menganggap '<' dan '{' di luar kode sebagai sintaks. Di catatan biasa itu hanya teks
// (mis. <?php, {x}), jadi diberi backslash sebelum dimuat dan dilepas lagi saat disimpan.
function protect(md) {
  const parts = md.split(/(^```[\s\S]*?^```[^\n]*$)/m);
  return parts.map((seg, i) => {
    if (i % 2 === 1) return seg;
    return seg.replace(/(`+)[\s\S]*?\1|([<{}])/g, (m, _t, ch) => (ch ? '\\' + ch : m));
  }).join('');
}
window.__clean = clean;

function isDark() {
  return document.documentElement.classList.contains('dark');
}

function App({ doc, api, opts, host }) {
  const ref = useRef(null);
  useEffect(() => { api.ref = ref.current; }, []);
  return (
    <MDXEditor
      ref={ref}
      markdown={doc}
      overlayContainer={host}
      toMarkdownOptions={{ bullet: '-', listItemIndent: 'one', rule: '-', emphasis: '*', strong: '*', fences: true }}
      className={isDark() ? 'dark-theme note-visual' : 'note-visual'}
      contentEditableClassName="prose note-visual-content"
      onError={(e) => opts.onError && opts.onError(e)}
      onChange={(md, initial) => {
        if (initial) { opts.onNormalize && opts.onNormalize(clean(md)); return; }
        api.value = clean(md);
        opts.onChange && opts.onChange();
      }}
      plugins={[
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo /><Separator />
              <BlockTypeSelect /><Separator />
              <BoldItalicUnderlineToggles /><CodeToggle /><Separator />
              <ListsToggle /><Separator />
              <CreateLink /><InsertTable /><InsertCodeBlock /><InsertThematicBreak />
            </>
          ),
        }),
        headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(),
        linkPlugin(), linkDialogPlugin(),
        imagePlugin({ imagePreviewHandler: async (src) => (opts.resolveImage ? opts.resolveImage(src) : src) }),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
        codeMirrorPlugin({ codeBlockLanguages: LANGS }),
        markdownShortcutPlugin(),
      ]}
    />
  );
}

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { this.props.onError && this.props.onError({ error: String(err && err.message || err) }); }
  render() { return this.state.err ? null : this.props.children; }
}

window.NoteEditorVisual = {
  create(parent, doc, opts = {}) {
    const api = { value: doc, ref: null };
    const shown = protect(doc);
    const host = document.createElement('div');
    host.className = 'note-visual-host';
    parent.appendChild(host);
    host.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        opts.onSave && opts.onSave();
      }
    });
    const root = createRoot(host);
    root.render(<Boundary onError={opts.onError}><App doc={shown} api={api} opts={opts} host={host} /></Boundary>);
    return {
      get value() { return api.value; },
      focus() { try { api.ref && api.ref.focus(); } catch {} },
      destroy() { try { root.unmount(); } catch {} host.remove(); },
    };
  },
};
