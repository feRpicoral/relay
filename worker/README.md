# Relay agent worker

Long-lived voice agent that joins LiveKit rooms when a call arrives, runs the
STT → LLM → TTS pipeline, and handles tool calls.

Run locally:

```
yarn worker:dev
```

Deploy: see `worker/Dockerfile`. Suggested target: Fly.io in `gru` (São Paulo)
for proximity to Twilio's Brazil presence.

Environment: every var in `.env.example` is required for production. Locally,
unset providers fall back to no-op stubs so the dashboard demo doesn't crash.
