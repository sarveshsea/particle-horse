import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
test("starts with a black wordless canvas", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  expect(html).toMatch(/background:\s*#000/);
  expect(html.match(/<body>([\s\S]*?)<\/body>/)?.[1].trim()).toMatch(
    /^<script /,
  );
});
