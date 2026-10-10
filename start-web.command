#!/usr/bin/env bash
# Open this checkout's web dashboard on the local machine.
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$repo_dir/start-hermes.command" dashboard --host 127.0.0.1 --port 9119 "$@"
