FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    build-essential \
    tini \
  && rm -rf /var/lib/apt/lists/*

# We DON'T set NODE_ENV=production globally. Yarn 4 still installs
# devDependencies regardless of NODE_ENV (unlike npm), but tsx is needed at
# runtime to execute the worker — keeping NODE_ENV unset during the install
# phase avoids any future "Yarn started skipping dev deps" gotcha.
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.14.1 --activate

# Prisma 7's `postinstall: prisma generate` (declared in package.json) runs
# as part of `yarn install`, so the schema + config + tsconfig must be present
# BEFORE the install — otherwise generate fails with "Could not find Prisma
# Schema" and the whole install aborts.
COPY package.json yarn.lock .yarnrc.yml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

# `prisma.config.ts` reads DIRECT_URL at module load. The build-time placeholder
# only satisfies the throw during generate. We unset DIRECT_URL again after
# install so a deploy that forgets to override it fails loudly instead of
# silently trying to connect to "buildtime".
RUN DIRECT_URL=postgresql://buildtime/placeholder yarn install --immutable

COPY src/lib ./src/lib
COPY worker ./worker

# Drop to a non-root user. node:bookworm ships an unprivileged `node` user.
RUN chown -R node:node /app
USER node

# Set the runtime env after install so the build-time placeholder doesn't
# survive into prod.
ENV NODE_ENV=production

# tini is PID 1 so SIGTERM is delivered correctly and graceful shutdown works.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["yarn", "tsx", "worker/agent.ts", "start"]
