FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install curl to support docker healthchecks and other scripts
RUN apt update \
	&& apt install -y --no-install-recommends curl build-essential pkg-config python3-dev libcairo2-dev libpango-1.0-0 libpangoft2-1.0-0 libjpeg-dev zlib1g-dev libopenjp2-7-dev libffi-dev libgdk-pixbuf-2.0-0 shared-mime-info \
	&& rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --shell /bin/sh appuser

USER appuser

WORKDIR /app

COPY --chown=appuser:appuser . .

RUN uv sync

ENTRYPOINT [ "scripts/entrypoint.sh" ]