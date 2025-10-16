FROM oven/bun:1.3

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

CMD [ "bun", "dev", "--host", "0.0.0.0" ]
