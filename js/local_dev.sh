#!/bin/bash

echo "Running npm install..."
npm install &
echo "Starting Docker containers..."
docker compose -f "../local_dev/docker-compose.yml" up --wait &
wait
echo "Containers started."
echo ""
echo "Local mail inbox: http://localhost:8025/"
echo ""
echo "Starting local webserver"
npm run dev
