FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Build-time API URL (Railway injects VITE_API_URL; default for local docker build)
ARG VITE_API_URL=https://appotime.up.railway.app
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production: serve static files
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

# PORT read from env at runtime (Railway sets it)
CMD ["sh", "-c", "exec serve -s dist -l ${PORT:-8080}"]
