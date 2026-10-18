# ---------- Etapa 1: compilar ----------

FROM node:22-alpine AS build 
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY  . . 

# 
RUN npx prisma generate
RUN npm run build

# --- Etapa 2: Imagen Final ---
FROM node:22-alpine AS prod 
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

USER node
CMD ["node", "dist/main"]