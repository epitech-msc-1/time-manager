FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install curl to support docker healthchecks and other scripts
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --shell /bin/sh appuser

USER appuser

WORKDIR /app

COPY --chown=appuser:appuser . .

RUN uv sync

ENTRYPOINT [ "scripts/entrypoint.sh" ]