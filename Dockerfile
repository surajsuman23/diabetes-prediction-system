FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node docs ./docs
COPY --chown=node:node server ./server
USER node
ENV HOST=0.0.0.0 PORT=8212
EXPOSE 8212
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8212/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server/local.mjs"]
