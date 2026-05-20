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
# Prisma's schema validator requires the referenced env vars to be defined.
# The generated client reads them at runtime, so build-time placeholders are safe.
ENV DATABASE_URL=postgresql://buildtime/placeholder
ENV DIRECT_URL=postgresql://buildtime/placeholder
RUN yarn prisma generate

COPY tsconfig.json ./
COPY lib ./lib
COPY worker ./worker

CMD ["yarn", "tsx", "worker/agent.ts", "start"]
