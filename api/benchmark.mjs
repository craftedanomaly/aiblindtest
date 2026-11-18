import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";

const TOKEN_NAME = "model_test_visitor";
const MAX_BODY = 128 * 1024;
const PUBLIC_ID = /^[0-9a-f]{24}$/;
const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function loadDataset() {
  return JSON.parse(await readFile(new URL("../data/benchmark.json", import.meta.url), "utf8"));
}

function hashVisitor(id, key) {
  return createHmac("sha256", key).update(`public-model-test-visitor:${id}`).digest("base64url");
}

function visitor(req, res, key) {
  const cookie = req.headers.cookie?.split(/;\s*/).find((value) => value.startsWith(`${TOKEN_NAME}=`));
  const [id, signature] = cookie?.slice(TOKEN_NAME.length + 1).split(".") ?? [];
  if (id && VISITOR_ID.test(id) && signature?.length === 43 && /^[a-zA-Z0-9_-]+$/.test(signature) &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(hashVisitor(id, key)))) return id;
  const created = randomUUID();
  const secure = process.env.VERCEL || req.socket?.encrypted || req.headers["x-forwarded-proto"] === "https";
  res.setHeader("Set-Cookie", `${TOKEN_NAME}=${created}.${hashVisitor(created, key)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? "; Secure" : ""}`);
  return created;
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(body));
}

async function jsonBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) throw new RequestError(415, "JSON bekleniyor.");
  if (Number(req.headers["content-length"]) > MAX_BODY) throw new RequestError(413, "İstek çok büyük.");
  if (req.body !== undefined) {
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY) throw new RequestError(413, "İstek çok büyük.");
    return JSON.parse(raw);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY) throw new RequestError(413, "İstek çok büyük.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function collectChoices(test, ratings) {
  if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) throw new RequestError(400, "Puanlar geçersiz.");
  const images = new Map(test.prompts.flatMap(({ images }) => images.map(({ id, model }) => [id, model])));
  const entries = Object.entries(ratings);
  if (!entries.length) throw new RequestError(400, "En az bir görseli puanla.");
  return Object.fromEntries(entries.map(([id, stars]) => {
    if (!images.has(id) || !Number.isInteger(stars) || stars < 1 || stars > 5) throw new RequestError(400, "Puan veya görsel geçersiz.");
    return [id, { model: images.get(id), stars }];
  }));
}

function testView(test, choices, names) {
  const revealed = !!choices;
  return {
    id: test.id,
    title: test.title,
    completed: revealed,
    prompts: test.prompts.map(({ images, ...prompt }) => ({
      ...prompt,
      images: images.map(({ id, model }) => revealed
        ? { id, model: names[model] ?? model, stars: choices[id]?.stars }
        : { id }),
    })),
  };
}

class DatabaseUnavailable extends Error {}

async function supabaseRpc(name, args) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLIC_KEY;
  if (!url || !key) throw new DatabaseUnavailable();
  const headers = { "Content-Type": "application/json", apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
    method: "POST", headers, body: JSON.stringify(args),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new DatabaseUnavailable();
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

export function createHandler({ dataset = loadDataset, rpc = supabaseRpc, accessKey = () => process.env.BENCHMARK_ACCESS_KEY } = {}) {
  return async function handler(req, res) {
    try {
      if (req.method !== "GET" && req.method !== "POST") throw new RequestError(405, "Yöntem desteklenmiyor.");
      const key = accessKey();
      if (!/^[a-f0-9]{64}$/.test(key ?? "")) throw new DatabaseUnavailable();
      const source = await dataset();
      const url = new URL(req.url, "http://localhost");
      const base = { p_campaign: source.benchmarkId, p_access: key };
      let body;
      if (req.method === "POST") {
        const origin = req.headers.origin;
        if (req.headers["sec-fetch-site"] === "cross-site" || !origin || new URL(origin).host !== req.headers.host) {
          throw new RequestError(403, "İstek doğrulanamadı.");
        }
        body = await jsonBody(req);
      }
      const testId = req.method === "POST" ? body?.testId : url.searchParams.get("test");
      const test = testId && PUBLIC_ID.test(testId) ? source.tests.find(({ id }) => id === testId) : undefined;
      if ((req.method === "POST" || testId) && !test) throw new RequestError(404, "Test bulunamadı.");
      const visitorId = visitor(req, res, key);
      if (req.method === "POST") await rpc("record_public_model_test_vote", {
        ...base, p_test: test.id, p_visitor: visitorId, p_choices: collectChoices(test, body.ratings),
      });
      const state = await rpc("read_public_model_test_state", { ...base, p_visitor: visitorId, p_test: test?.id ?? null });
      const { choices, ...stats } = state;
      for (const scope of ["community", "personal"]) stats[scope] = stats[scope].map((entry) => ({
        ...entry, model: source.models[entry.model] ?? entry.model,
      }));
      return json(res, 200, {
        ...stats,
        tests: source.tests.map(({ id, title, prompts }) => ({
          id, title, prompts: prompts.length, images: prompts.reduce((sum, prompt) => sum + prompt.images.length, 0),
          topics: prompts.slice(0, 3).map((prompt) => prompt.title),
        })),
        ...(test ? { test: testView(test, choices, source.models) } : {}),
      });
    } catch (error) {
      const known = error instanceof RequestError;
      const invalidJson = error instanceof SyntaxError;
      json(res, known ? error.status : invalidJson ? 400 : 503, {
        error: known ? error.message : invalidJson ? "İstek geçersiz." : "Test verileri şu anda kullanılamıyor.",
      });
    }
  };
}

export default createHandler();
