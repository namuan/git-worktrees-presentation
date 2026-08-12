import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('index.html');
const html = readFileSync(file, 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect((html.match(/<section class="slide/g) || []).length >= 12, 'Expected at least 12 slides.');
expect(html.includes('id="play"') && html.includes('id="pause"') && html.includes('id="reset"'), 'The live walkthrough controls are incomplete.');
expect(html.includes('id="step"') && html.includes('id="speed"'), 'Step and speed controls are required.');
expect(html.includes('git worktree add -b feature/search'), 'The primary creation example is missing.');
expect(html.includes('git worktree remove') && html.includes('git worktree prune'), 'Lifecycle commands are missing.');
expect(html.includes('What Git is managing') && html.includes('Sources & accuracy notes'), 'Core explanatory sections are missing.');
expect(!html.includes('TODO') && !html.includes('{{'), 'Unresolved placeholder found.');

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const [index, script] of scripts.entries()) {
  try { new Function(script); }
  catch (error) { failures.push(`Inline script ${index + 1} has a syntax error: ${error.message}`); }
}

if (failures.length) {
  console.error('CHECK FAILED');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`CHECK PASSED — ${html.length} bytes, ${(html.match(/<section class="slide/g) || []).length} slides, ${scripts.length} inline script(s).`);
