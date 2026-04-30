import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js');
const indexHtmlPath = path.join(root, 'dist', 'index.html');

if (!fs.existsSync(ssrEntry)) {
  console.error(`[prerender] SSR bundle not found at ${ssrEntry}`);
  process.exit(1);
}
if (!fs.existsSync(indexHtmlPath)) {
  console.error(`[prerender] dist/index.html not found at ${indexHtmlPath}`);
  process.exit(1);
}

const { render } = await import(pathToFileURL(ssrEntry).href);
const html = render({ lang: 'en' });

const template = fs.readFileSync(indexHtmlPath, 'utf-8');
if (!template.includes('<div id="root"></div>')) {
  console.error('[prerender] index.html does not contain <div id="root"></div> placeholder');
  process.exit(1);
}

const out = template.replace(
  '<div id="root"></div>',
  `<div id="root" data-prerendered="true">${html}</div>`
);
fs.writeFileSync(indexHtmlPath, out);

fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true });

console.log(`[prerender] injected ${html.length} bytes into ${path.relative(root, indexHtmlPath)}`);
