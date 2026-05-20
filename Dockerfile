FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.14.1 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
# `prisma.config.ts` reads DIRECT_URL at module load. A build-time placeholder
# satisfies the throw; the generated client uses the real DATABASE_URL via the
# adapter at runtime.
ENV DIRECT_URL=postgresql://buildtime/placeholder
RUN yarn prisma generate

COPY lib ./lib
COPY worker ./worker

CMD ["yarn", "tsx", "worker/agent.ts", "start"]
