// Sumber editor CodeMirror 6. Hasil build-nya ada di ../public/editor.js.
// Cara build ulang: lihat build.txt
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, indentOnInput, bracketMatching } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';

window.NoteEditor = {
  create(parent, doc, { onChange, onSave } = {}) {
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc,
        extensions: [
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(classHighlighter),
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                if (onSave) onSave();
                return true;
              },
            },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && onChange) onChange();
          }),
        ],
      }),
    });
    return {
      get value() {
        return view.state.doc.toString();
      },
      focus() {
        view.focus();
      },
      destroy() {
        view.destroy();
      },
    };
  },
};
