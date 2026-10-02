#!/bin/sh
set -e

echo "[entrypoint] running database migrations..."
node_modules/.bin/drizzle-kit migrate

echo "[entrypoint] starting server..."
exec node server.js
