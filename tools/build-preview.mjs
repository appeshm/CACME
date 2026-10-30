// Bundles the app into ONE self-contained HTML file (dist/preview.html) for sharing a demo.
// No EHR connection in the preview — manual entry only.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const r = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const strip = (src) => src
  .replace(/^import .*?;\s*$/gms, '')
  .replace(/^export (const|function|async function|class) /gm, '$1 ');

const modules = [
  'src/engine/evidence.js', 'src/engine/guideline-config.js', 'src/engine/prevent.js',
  'src/engine/therapies.js', 'src/engine/recommend.js', 'app/main.js',
];
const js = modules.map((m) => `// ---- ${m}\n${strip(r(m))}`).join('\n');
const index = r('app/index.html');
const body = index.split('<!-- BODY:START -->')[1].split('<!-- BODY:END -->')[0]
  .replace('<button type="button" id="ehr" hidden>Reload from chart</button>', '');
const fonts = index.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];

const html = `<title>CACME Prevention Planner</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${r('app/styles.css')}
</style>
${body}
<script>
(() => {
${js}
})();
</script>
`;
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/preview.html', import.meta.url), html);
console.log('dist/preview.html', html.length, 'bytes');
