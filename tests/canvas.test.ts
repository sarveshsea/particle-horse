import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
test('starts with a black wordless canvas', () => {
 const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
 expect(html).toContain('background:#000');
 expect(html.match(/<body>(.*?)<\/body>/)?.[1]).toMatch(/^<script /);
});
