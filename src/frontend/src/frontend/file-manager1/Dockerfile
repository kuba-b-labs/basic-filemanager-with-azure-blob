# stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package-lock.json package.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

RUN npm run build

# stage 2: nginx setup

FROM nginx:1.29.1-alpine-slim AS runner

RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx \
 && chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

COPY --chown=nginx:nginx  --from=builder /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

ENTRYPOINT ["nginx", "-c", "/etc/nginx/nginx.conf"]
CMD ["-g", "daemon off;"]


