#!/bin/sh
# Open the CSM Candidature Planner in your default browser with a local server.
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "CSM Planner at http://localhost:$PORT"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT"
