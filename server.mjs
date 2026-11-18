import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import benchmark from "./api/benchmark.mjs";

const staticTypes = new Map([
  ["/", "text/html; charset=utf-8"],
  ["/app.js", "text/javascript; charset=utf-8"],
  ["/styles.css", "text/css; charset=utf-8"],
  ["/fonts/barlow-condensed-latin-700-normal.woff2", "font/woff2"],
  ["/fonts/Barlow-OFL.txt", "text/plain; charset=utf-8"],
]);
export const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/api/benchmark") return benchmark(req, res);
  const media = /^\/media\/[0-9a-f]{24}\.webp$/.test(pathname);
  const contentType = media ? "image/webp" : staticTypes.get(pathname);
  if (!contentType || !["GET", "HEAD"].includes(req.method)) { res.writeHead(404).end(); return; }
  const file = new URL(`./public${pathname === "/" ? "/index.html" : pathname}`, import.meta.url);
  try {
    const { size } = await stat(file);
    res.writeHead(200, {
      "Content-Type": contentType, "Content-Length": size, "X-Content-Type-Options": "nosniff",
      "Cache-Control": media ? "public, max-age=31536000, immutable" : "no-cache",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(file).on("error", () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4380);
server.listen(port, host, () => process.stdout.write(`Model Test http://${host}:${server.address().port}\n`));
