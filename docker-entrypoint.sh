#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Wait for database
node wait-for-db.js

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting application..."
exec "$@"
