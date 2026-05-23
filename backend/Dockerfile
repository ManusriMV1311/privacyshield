# ========================================================
# Stage 1: Dependency Installation & Compilation Builder
# ========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy configuration files and dependencies manifests
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/

# Install all dependencies including devDependencies for tsc compilation
RUN npm ci

# Copy core source codes
COPY src ./src/

# Generate Prisma Client database bindings
RUN npx prisma generate

# Build TypeScript to minified Javascript
RUN npm run build

# Remove development dependencies to keep production footprint tiny
RUN npm prune --production

# ========================================================
# Stage 2: Microscopic Production Alpine Runtime Container
# ========================================================
FROM node:20-alpine

WORKDIR /app

# Copy production package manifest and lightweight node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/prisma ./prisma/

# Declare default runtime variables
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Execute server bootup
CMD ["node", "dist/src/server.js"]
