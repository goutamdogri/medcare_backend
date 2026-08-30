#!/bin/bash

URL="https://medcare-backend-hnou.onrender.com/health"

while true; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Sending health check..."

    response=$(curl -s -o /dev/null -w "HTTP %{http_code}\n" "$URL")

		echo "$response"

    sleep 49
done