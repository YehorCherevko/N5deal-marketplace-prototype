FROM node:22.22.2-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
RUN npm ci && sha256sum package-lock.json | cut -d ' ' -f 1 > node_modules/.n5deal-lock
COPY . .
RUN DATABASE_URL=postgresql://unused:unused@localhost:5432/unused npm run db:generate
EXPOSE 3000
ENTRYPOINT ["sh", "/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
