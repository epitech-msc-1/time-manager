FROM oven/bun:1.3

WORKDIR /app

COPY . .

RUN bun install

CMD [ "bun", "dev", "--host", "0.0.0.0" ]
