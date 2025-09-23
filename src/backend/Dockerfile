FROM python:3.13-alpine AS builder

COPY --from=ghcr.io/astral-sh/uv:0.8.19 /uv /uvx /bin/ 

COPY . /app

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev
#    uv sync --locked

# step 2

FROM python:3.13-alpine AS runner

WORKDIR /app

RUN adduser -s /bin/sh -S filemanager

COPY --from=builder --chown=filemanager:filemanager /app/.venv ./.venv
COPY --from=builder --chown=filemanager:filemanager /app/src ./src

USER filemanager

EXPOSE 8000

CMD [".venv/bin/uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]