FROM node:18-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN mkdir -p dist/swagger && cp -r src/swagger/* dist/swagger/ || true


FROM node:18-slim AS runner
WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "dist/index.js"]