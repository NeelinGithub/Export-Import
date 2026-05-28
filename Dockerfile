# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy configuration and compiled assets
COPY package*.json ./
# Install only production dependencies (external libraries like express needed by server.cjs)
RUN npm ci --omit=dev

# Copy Vite build index & bundled server.cjs from the builder stage
COPY --from=builder /app/dist ./dist

# Standard Node port ingress matching standard proxy targets
EXPOSE 3000

# Start the application using compiled CommonJS server bundle
CMD ["node", "dist/server.cjs"]
