import { createHash } from "node:crypto";
import { loadDataset } from "./api/benchmark.mjs";

const key = process.env.BENCHMARK_ACCESS_KEY;
const { benchmarkId } = await loadDataset();
if (!/^[a-f0-9]{64}$/.test(key ?? "") || !/^[a-z0-9-]{1,64}$/.test(benchmarkId)) {
  throw new Error("Önce .env.local dosyasına 64 karakterlik BENCHMARK_ACCESS_KEY ekle.");
}
const digest = createHash("sha256").update(key).digest("hex");
console.log(`insert into public.public_model_test_campaigns (id, access_digest) values ('${benchmarkId}', decode('${digest}', 'hex')) on conflict (id) do nothing;`);
