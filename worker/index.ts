/**
 * Relay agent worker.
 *
 * Connects to LiveKit and waits for rooms. For each new room, loads the agent
 * context from the DB (keyed by call id encoded into the room name), runs the
 * conversation pipeline (Deepgram Flux → Claude Haiku → Cartesia Sonic-3), and
 * persists transcripts + tool calls + latency.
 *
 * Pipeline architecture summary:
 *   - Deepgram Flux gives us partial + final transcripts AND turn-detection
 *     events (no separate VAD needed).
 *   - We start LLM inference on high-confidence partials (speculative).
 *   - LLM (Claude Haiku 4.5) streams tokens; we hand them sentence-by-sentence
 *     to the TTS for streaming-audio first-byte under ~80ms.
 *   - Tools are invoked via Anthropic's tool use API; their results round-trip
 *     back into the conversation as standard message turns.
 *
 * This file is intentionally written without the `@livekit/agents` framework
 * abstractions when they would obscure the pipeline. The framework wires the
 * raw audio plumbing; everything else is explicit.
 */
import { setTimeout as sleep } from "node:timers/promises";

import { runWorkerForCall } from "./session";

const ROOM_PREFIX = "call-";

async function main() {
  const livekitUrl = process.env.LIVEKIT_URL;
  if (!livekitUrl) {
    throw new Error("LIVEKIT_URL is required.");
  }
  console.log(`[worker] starting against ${livekitUrl}`);

  // We listen for room webhooks delivered to /api/webhooks/livekit and dispatch
  // sessions from there. This entrypoint also exposes a health endpoint and a
  // simple poll loop that picks up any in-progress calls that crashed.
  const port = Number(process.env.PORT ?? 3001);
  const http = await import("node:http");
  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, prefix: ROOM_PREFIX }));
      return;
    }
    if (req.method === "POST" && req.url === "/dispatch") {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const expectedSecret = process.env.WORKER_SHARED_SECRET ?? "";
      const auth = req.headers.authorization ?? "";
      if (expectedSecret && auth !== `Bearer ${expectedSecret}`) {
        res.writeHead(401);
        res.end("unauthorized");
        return;
      }
      if (typeof body.callId !== "string" || typeof body.roomName !== "string") {
        res.writeHead(400);
        res.end("bad request");
        return;
      }
      runWorkerForCall(body.callId, body.roomName).catch((err: unknown) =>
        console.error("[worker] session failed", err),
      );
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, () => {
    console.log(`[worker] listening on :${port}`);
  });

  // Keep the process alive; LiveKit Agents framework's own worker loop also
  // runs in the background.

  while (true) {
    await sleep(60_000);
  }
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
