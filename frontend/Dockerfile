FROM oven/bun:1.3

WORKDIR /app

COPY . .

RUN bun install --frozen-lock

CMD [ "bun", "dev", "--host", "0.0.0.0" ]
