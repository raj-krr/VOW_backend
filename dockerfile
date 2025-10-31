FROM node:18-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN mkdir -p dist/swagger && \
    cp src/swagger/swagger.yaml dist/swagger/ && \
    cp src/swagger/workspace.yaml dist/swagger/ && \
    cp src/swagger/msg.yaml dist/swagger/ && \
    cp src/swagger/map.yaml dist/swagger/ && \
    cp src/swagger/meeting.yaml dist/swagger/


FROM node:18-slim AS runner
WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]