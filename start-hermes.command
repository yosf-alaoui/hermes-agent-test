#!/usr/bin/env bash
# Start this checkout with its separate local data home and local 4B model.
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_dir"
export HERMES_HOME="${HERMES_HOME:-$HOME/.local/share/hermes-agent-test}"
export HERMES_RUNTIME_DIR="${HERMES_RUNTIME_DIR:-$HERMES_HOME/tools}"
. "$repo_dir/scripts/_activation.sh"
runtime_exports="$(hermes_compose_env "$repo_dir" sh)" || {
    printf '%s\n' 'Hermes runtime is not ready. Follow project-context/RUNNING.md.' >&2
    exit 1
}
hermes_apply_env "$runtime_exports"
if ! curl --fail --silent --max-time 2 http://127.0.0.1:11434/api/version >/dev/null; then
    ollama_bin="$HERMES_HOME/local-model-runtime/ollama-v0.40.2/ollama"
    if [ ! -x "$ollama_bin" ]; then
        printf '%s\n' 'Local Ollama runtime is missing. Follow project-context/RUNNING.md.' >&2
        exit 1
    fi
    mkdir -p "$HERMES_HOME/logs"
    OLLAMA_HOST=127.0.0.1:11434 \
    OLLAMA_MODELS="$HERMES_HOME/models" \
    OLLAMA_CONTEXT_LENGTH=65536 \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_FLASH_ATTENTION=1 \
    OLLAMA_KV_CACHE_TYPE=q4_0 \
    OLLAMA_NO_CLOUD=1 \
        nohup "$ollama_bin" serve >>"$HERMES_HOME/logs/ollama-server.log" 2>&1 </dev/null &
    ollama_pid=$!
    for attempt in {1..60}; do
        if curl --fail --silent --max-time 1 http://127.0.0.1:11434/api/version >/dev/null; then
            break
        fi
        if ! kill -0 "$ollama_pid" 2>/dev/null; then
            printf '%s\n' "Ollama failed to start; see $HERMES_HOME/logs/ollama-server.log" >&2
            exit 1
        fi
        sleep 0.5
    done
    if ! curl --fail --silent --max-time 2 http://127.0.0.1:11434/api/version >/dev/null; then
        printf '%s\n' 'Ollama did not become ready within 30 seconds.' >&2
        exit 1
    fi
fi
exec python3 "$repo_dir/hermes" --cli "$@"
