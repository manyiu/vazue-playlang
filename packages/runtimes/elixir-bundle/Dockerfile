# Cook Playlang's Elixir eval AVM with the exact Popcorn toolchain.
# Prefer `pnpm cook:elixir` / scripts/cook-elixir.sh (mounts the Mix project).
FROM hexpm/elixir:1.17.3-erlang-26.0.2-ubuntu-noble-20260730.1

WORKDIR /app
ENV MIX_ENV=prod \
    HEX_HTTP_CONCURRENCY=1

COPY mix.exs mix.lock* ./
COPY config ./config
COPY lib ./lib

RUN mix local.hex --force --if-missing \
 && mix local.rebar --force --if-missing \
 && mix deps.get \
 && mix compile \
 && mix popcorn.cook

# Default: copy artifacts out via `docker build -o` or volume mount.
CMD ["ls", "-lh", "artifacts"]
