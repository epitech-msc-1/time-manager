FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt update \
	&& apt install -y --no-install-recommends curl git \
	&& rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --shell /bin/sh appuser

USER appuser

WORKDIR /app

COPY --chown=appuser:appuser . .

RUN uv sync

CMD [ "uv", "run", "mkdocs", "serve", "--dev-addr",  "0.0.0.0:7000"]

EXPOSE 7000