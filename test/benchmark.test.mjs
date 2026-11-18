import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { createHandler } from "../api/benchmark.mjs";

const testId = "a".repeat(24);
const image = "1".repeat(24);
const otherImage = "2".repeat(24);
const dataset = {
  benchmarkId: "fixture", models: { alpha: "Alpha", beta: "Beta" },
  tests: [{ id: testId, title: "Test 01", prompts: [{ id: "p", title: "Blue vase", prompt: "A blue vase in a studio.", images: [{ id: image, model: "alpha" }, { id: otherImage, model: "beta" }] }] }],
};

test("blind results, server-mapped ratings, cookie scope and repeat votes", async () => {
  const votes = new Map();
  const handler = createHandler({ dataset: async () => dataset, accessKey: () => "f".repeat(64), rpc: async (name, params) => {
    assert.equal(params.p_access, "f".repeat(64));
    if (name.startsWith("record")) {
      assert.equal(params.p_test, testId);
      assert.deepEqual(params.p_choices, { [image]: { model: "alpha", stars: 5 } });
      if (!votes.has(params.p_visitor)) votes.set(params.p_visitor, params.p_choices);
      return null;
    }
    const choices = votes.get(params.p_visitor) ?? null;
    return { participants: votes.size, community: [], personal: choices ? [{ model: "alpha", average: 5, votes: 1 }] : [], completed: choices ? [testId] : [], choices: params.p_test ? choices : null };
  } });
  const server = createServer(handler).listen(0, "127.0.0.1");
  await once(server, "listening");
  const host = `http://127.0.0.1:${server.address().port}`;
  const route = host + "/api/benchmark";
  const get = (cookie) => fetch(`${route}?test=${testId}`, { headers: cookie ? { Cookie: cookie } : {} });
  try {
    const first = await get();
    const cookie = first.headers.get("set-cookie").split(";")[0];
    const blind = await first.json();
    assert.equal(blind.test.completed, false);
    assert.deepEqual(blind.test.prompts[0].images, [{ id: image }, { id: otherImage }]);
    assert.ok(!JSON.stringify(blind).includes("Alpha"));
    const post = (ratings, origin = host) => fetch(route, {
      method: "POST", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ testId, ratings, model: "forged" }),
    });
    assert.equal((await post({ [image]: 5 }, "https://foreign.example")).status, 403);
    assert.equal((await post({ ["9".repeat(24)]: 5 })).status, 400);
    assert.equal((await post({ [image]: 6 })).status, 400);
    assert.equal(votes.size, 0);
    const result = await (await post({ [image]: 5 })).json();
    assert.equal(result.test.completed, true);
    assert.deepEqual(result.test.prompts[0].images[0], { id: image, model: "Alpha", stars: 5 });
    await post({ [image]: 5 });
    assert.equal(votes.size, 1);
    assert.equal((await (await get(cookie)).json()).test.completed, true);
    assert.equal((await (await get(cookie + "x")).json()).test.completed, false);
    assert.equal((await (await get()).json()).test.completed, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
