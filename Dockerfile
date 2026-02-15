# ─── Builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/

RUN npx esbuild src/lambda.ts \
      --bundle \
      --platform=node \
      --target=node22 \
      --outfile=bundle/index.js \
      --format=cjs \
      --external:@aws-sdk/*

RUN npx tsc

# ─── Lambda Target (default) ───────────────────────────────────────
# docker build --target lambda -t a2a-agent .
FROM public.ecr.aws/lambda/nodejs:22 AS lambda
COPY --from=builder /app/bundle/index.js ${LAMBDA_TASK_ROOT}/index.js
CMD ["index.handler"]

# ─── Server Target ─────────────────────────────────────────────────
# docker build --target server -t a2a-agent:server .
FROM node:22-slim AS server
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ dist/

EXPOSE 3000
CMD ["node", "dist/server.js"]
