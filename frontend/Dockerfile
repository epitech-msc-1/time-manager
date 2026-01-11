# Build stage
FROM oven/bun:latest as builder

RUN useradd --system --create-home --shell /bin/sh appuser

USER appuser

WORKDIR /app

COPY --chown=appuser:appuser . .

RUN bun install
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
