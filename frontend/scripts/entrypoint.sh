#!/bin/bash

# Build the application for production
# This ensures that VITE_API_URL and other env vars are baked into the build
echo "Building frontend..."
bun run build

# Serve the production build using vite preview
# Note: In a real enterprise setup, we would use Nginx, but 'vite preview' is sufficient
# and supports the SPA fallback and single commands better than ad-hoc http-servers here.
echo "Starting preview server..."
bun run preview --host 0.0.0.0 --port ${VITE_PORT}
