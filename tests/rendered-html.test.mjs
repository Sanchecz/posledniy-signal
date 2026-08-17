import assert from "node:assert/strict";
import test from "node:test";

async function render(url = "https://signal.example/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  const requestUrl = new URL(url);
  return worker.fetch(
    new Request(url, {
      headers: {
        accept: "text/html",
        host: requestUrl.host,
        "x-forwarded-host": requestUrl.host,
        "x-forwarded-proto": requestUrl.protocol.slice(0, -1),
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the production game shell and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ru"/i);
  assert.match(html, /<title>Последний сигнал — интерактивная новелла-кликер<\/title>/i);
  assert.match(html, /name="description"[^>]*Мобильная новелла-кликер/i);
  assert.match(html, /rel="manifest"[^>]*href="(?:https:\/\/signal\.example)?\/manifest\.webmanifest"/i);
  assert.match(html, /property="og:image"[^>]*content="https:\/\/signal\.example\/og\.png"/i);
  assert.match(html, /Сцена «Мёртвая орбита»/);
  assert.match(html, /Послать импульс/);
  assert.match(html, /История/);
  assert.match(html, /Судьба/);
  assert.match(html, /ЭХО СИГНАЛА/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("adds restrictive production security headers", async () => {
  const response = await render("https://signal.example/");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.match(response.headers.get("content-security-policy") ?? "", /object-src 'none'/);
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
});
