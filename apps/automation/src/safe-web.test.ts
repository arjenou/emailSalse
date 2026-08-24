import assert from "node:assert/strict";
import test from "node:test";
import { decodeEntities, extractLinks, htmlToText } from "./safe-web";

test("htmlToText removes executable and style content", () => {
  assert.equal(htmlToText("<style>.x{}</style><p>会社 &amp; 製品</p><script>alert(1)</script>"), "会社 & 製品");
});

test("extractLinks resolves relative links and drops non-http protocols", () => {
  const links = extractLinks('<a href="/company">株式会社 例</a><a href="mailto:a@example.jp">mail</a>', "https://directory.jp/list");
  assert.deepEqual(links, [{ url: "https://directory.jp/company", text: "株式会社 例" }]);
});

test("decodeEntities supports named and numeric entities", () => {
  assert.equal(decodeEntities("A&amp;B &#x65E5;&#26412;"), "A&B 日本");
});
