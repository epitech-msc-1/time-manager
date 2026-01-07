FROM oven/bun:1.3.3

RUN useradd --system --create-home --shell /bin/sh appuser

USER appuser

WORKDIR /app

COPY --chown=appuser:appuser . .

RUN bun install

ENTRYPOINT [ "scripts/entrypoint.sh" ]
