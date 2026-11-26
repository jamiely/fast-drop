import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const files = (await readdir('dist', { recursive: true })).filter(
  (file) => file.endsWith('.js') || file.endsWith('.css')
);
assert(
  files.some((file) => file.endsWith('.js')),
  'Build classic first'
);
for (const file of files) {
  const source = await readFile(`dist/${file}`, 'utf8');
  assert(
    !source.includes('FAST_DROP_FEVER_JUICE_CORE'),
    `Juice leaked into classic: ${file}`
  );
  assert(
    !/fever-overlay|data-fever-combo/.test(source),
    `Fever UI leaked into classic: ${file}`
  );
  assert(
    !/luminosityThreshold|UnrealBloomPass/.test(source),
    `Bloom composer leaked into classic: ${file}`
  );
}
console.log(
  `PASS: classic bundle has no juice marker, Fever UI or bloom composer (${files.length} assets checked)`
);
