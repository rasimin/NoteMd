'use strict';
// Ekspor catatan: dokumen HTML mandiri, PDF (lewat Edge/Chrome headless), dan Word (.docx).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 24px; background: #fff; color: #18181b; font: 15px/1.7 "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; }
main { max-width: 820px; margin: 0 auto; }
.meta { color: #71717a; font-size: 12.5px; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid #e4e4e7; }
h1, h2, h3, h4 { line-height: 1.3; margin: 1.6em 0 .5em; }
h1 { font-size: 1.9em; margin-top: 0; } h2 { font-size: 1.45em; padding-bottom: .25em; border-bottom: 1px solid #e4e4e7; } h3 { font-size: 1.2em; }
p, ul, ol, table, pre, blockquote { margin: 0 0 1em; }
a { color: #2563eb; }
img { max-width: 100%; height: auto; border: 1px solid #e4e4e7; border-radius: 6px; }
code { font: 0.9em Consolas, "Cascadia Mono", Menlo, monospace; background: #f4f4f5; padding: .1em .35em; border-radius: 4px; }
pre { background: #f6f8fa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px 14px; overflow: auto; white-space: pre-wrap; word-break: break-word; }
pre code { background: none; padding: 0; font-size: 13px; }
blockquote { border-left: 3px solid #d4d4d8; margin-left: 0; padding-left: 14px; color: #52525b; }
table { border-collapse: collapse; width: auto; max-width: 100%; }
th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f4f4f5; }
hr { border: 0; border-top: 1px solid #e4e4e7; margin: 1.5em 0; }
.hljs-keyword, .hljs-selector-tag, .hljs-doctag { color: #cf222e; }
.hljs-string, .hljs-regexp, .hljs-addition { color: #0a3069; }
.hljs-number, .hljs-literal, .hljs-symbol, .hljs-bullet { color: #0550ae; }
.hljs-comment, .hljs-quote { color: #6e7781; font-style: italic; }
.hljs-built_in, .hljs-title, .hljs-section { color: #8250df; }
.hljs-type, .hljs-variable, .hljs-template-variable { color: #953800; }
.hljs-attr, .hljs-attribute, .hljs-property, .hljs-name, .hljs-tag { color: #0550ae; }
.hljs-deletion { color: #cf222e; } .hljs-strong { font-weight: 700; } .hljs-emphasis { font-style: italic; }
@page { size: A4; margin: 16mm; }
@media print { body { padding: 0; font-size: 12pt; } main { max-width: none; } pre, table, img, blockquote { break-inside: avoid; } h1, h2, h3 { break-after: avoid; } a { color: inherit; } }
`;

function htmlDocument({ title, meta, bodyHtml, autoPrint = false }) {
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body><main><p class="meta">${esc(meta)}</p>${bodyHtml}</main>${
    autoPrint ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>' : ''
  }</body></html>`;
}

// ---------- PDF ----------

function findBrowser() {
  const cands = [];
  if (process.env.EXPORT_BROWSER) cands.push(process.env.EXPORT_BROWSER);
  const env = process.env;
  if (process.platform === 'win32') {
    for (const base of [env['ProgramFiles(x86)'], env.ProgramFiles, env.LOCALAPPDATA].filter(Boolean)) {
      cands.push(path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
      cands.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      cands.push(path.join(base, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'));
    }
  } else if (process.platform === 'darwin') {
    cands.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    cands.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    cands.push('/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return cands.find((c) => {
    try {
      return fs.statSync(c).isFile();
    } catch {
      return false;
    }
  });
}

function makePdf(html) {
  return new Promise((resolve, reject) => {
    const browser = findBrowser();
    if (!browser) return reject(Object.assign(new Error('Edge atau Chrome tidak ditemukan'), { code: 'NO_BROWSER' }));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ainote-pdf-'));
    const htmlFile = path.join(dir, 'in.html');
    const pdfFile = path.join(dir, 'out.pdf');
    fs.writeFileSync(htmlFile, html, 'utf8');
    const args = [
      '--headless',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      `--user-data-dir=${path.join(dir, 'profile')}`,
      `--print-to-pdf=${pdfFile}`,
    ];
    if (typeof process.getuid === 'function' && process.getuid() === 0) args.push('--no-sandbox');
    args.push(pathToFileURL(htmlFile).href);
    const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
    execFile(browser, args, { timeout: 60000, windowsHide: true }, (err) => {
      try {
        if (!fs.existsSync(pdfFile) || fs.statSync(pdfFile).size === 0) {
          throw err || new Error('PDF tidak terbentuk');
        }
        const buf = fs.readFileSync(pdfFile);
        cleanup();
        resolve(buf);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  });
}

// ---------- Word ----------

// Word tidak menjaga spasi/baris di dalam <pre> yang berisi span warna, jadi blok kode dijadikan paragraf monospasi biasa.
function flattenCode(html) {
  return html.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/\n$/, '');
    const lines = text.split('\n').map((l) =>
      l.replace(/\t/g, '    ').replace(/^ +/, (m) => '&nbsp;'.repeat(m.length)).replace(/ {2}/g, '&nbsp; '),
    );
    return `<p style="font-family: Consolas; font-size: 10pt; background-color: #f6f8fa">${lines.join('<br>')}</p>`;
  });
}

async function makeDocx(html) {
  html = flattenCode(html);
  let htmlToDocx;
  try {
    htmlToDocx = require('html-to-docx');
  } catch {
    throw Object.assign(new Error('Pustaka Word belum terpasang'), { code: 'NO_DOCX' });
  }
  const out = await htmlToDocx(html, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
    font: 'Calibri',
    fontSize: 22,
  });
  return Buffer.isBuffer(out) ? out : Buffer.from(out instanceof ArrayBuffer ? out : await out.arrayBuffer());
}

module.exports = { htmlDocument, makePdf, makeDocx, findBrowser };
