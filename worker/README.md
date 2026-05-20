# Relay agent worker

Long-lived voice agent that joins LiveKit rooms when a call arrives, runs the
STT, LLM, TTS pipeline, and handles tool calls.

Run locally:

```
yarn worker:dev
```

Deploy: see the repo-root `Dockerfile` and `fly.toml`. Target is Fly.io in
`dfw` (Dallas).

Environment: every var in `.env.example` is required for production.
