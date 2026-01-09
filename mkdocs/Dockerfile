FROM python:3.12-slim-trixie as builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt update \
	&& apt install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --shell /bin/sh appuser

USER appuser

WORKDIR /app

COPY --chown=appuser:appuser . .

RUN uv sync

# Production stage
FROM nginx:alpine

COPY --from=builder /app/site /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80