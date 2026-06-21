# StayOn backend — production container image.
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only production deps against the committed lockfile (reproducible).
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

# Container health uses the no-auth /health route (Node 20 has global fetch).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
