#!/bin/bash
# Forward to root launcher script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exec "$SCRIPT_DIR/../start_dev.sh" "$@"
