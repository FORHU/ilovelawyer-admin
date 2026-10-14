FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
RUN apk add --no-cache libc6-compat

FROM base AS builder
COPY . .
RUN corepack prepare pnpm@10.33.0 --activate && pnpm install --frozen-lockfile
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# docker build -t ilovelawyer-admin .
