// Copies PDF.js runtime assets (CMaps, standard fonts, WebAssembly decoders, ICC profiles)
// from the pinned pdfjs-dist package to apps/drawings/public/pdfjs/. Run before `dev` and
// `build`; the copy is generated and not committed.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'drawings');
const require = createRequire(join(app, 'package.json'));
const source = dirname(require.resolve('pdfjs-dist/package.json'));
const { version } = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
const target = join(app, 'public', 'pdfjs');
const marker = join(target, 'VERSION');
const current = await readFile(marker, 'utf8').catch(() => '');
if (current.trim() === version) {
  console.log(`PDF.js assets ${version} already present.`);
} else {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs'])
    await cp(join(source, folder), join(target, folder), { recursive: true });
  await writeFile(marker, version + '\n');
  console.log(`PDF.js assets ${version} copied to apps/drawings/public/pdfjs.`);
}
