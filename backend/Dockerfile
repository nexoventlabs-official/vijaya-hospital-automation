# vijya-hospital backend — production image (mirrors the Restarunt pattern)

# Stage 1: dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: production
FROM node:20-alpine AS production

# dumb-init for correct PID 1 signal handling
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Dependencies from stage 1
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Application code (.dockerignore excludes node_modules, .env, tests, flow_keys, etc.)
COPY --chown=nodejs:nodejs . .

USER nodejs

# vijya-hospital listens on PORT (default 5050)
EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5050) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
