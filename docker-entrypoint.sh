#!/bin/sh
set -e

# If DATA_URL environment variable is set, create/override settings.json
if [ -n "$DATA_URL" ]; then
    # Legacy/Explicit URL mode (still useful for remote URLs)
    echo "Configuring Phos to load data from URL: $DATA_URL"
    DATA_SOURCE_URL="$DATA_URL"
elif [ -d "/usr/share/nginx/html/data" ]; then
    # Directory mount mode (new default)
    # 1. Look for custom DATA_FILE env
    # 2. Or auto-detect first json/csv
    if [ -n "$DATA_FILE" ]; then
        DATA_SOURCE_URL="data/$DATA_FILE"
        echo "Configuring Phos to load mounted file: $DATA_SOURCE_URL"
    else
        # Find first usable file
        FIRST_FILE=$(ls /usr/share/nginx/html/data | grep -E '\.(json|csv)$' | grep -v 'spec.json' | head -n 1)
        if [ -n "$FIRST_FILE" ]; then
            DATA_SOURCE_URL="data/$FIRST_FILE"
            echo "Auto-detected data file: $DATA_SOURCE_URL"
        fi
    fi
fi

if [ -n "$DATA_SOURCE_URL" ]; then
    # Default to read-only mode in Docker unless explicitly disabled
    IS_READ_ONLY=${READ_ONLY:-true}
    echo "{
  \"defaultDataset\": \"custom\",
  \"dataSource\": { \"url\": \"$DATA_SOURCE_URL\" },
  \"dataSourceMapping\": {
    \".json\": \"native\",
    \".csv\": \"native\",
    \".arrow\": \"duckdb-wasm\",
    \".parquet\": \"duckdb-wasm\"
  },
  \"readOnly\": $IS_READ_ONLY
}" > /usr/share/nginx/html/settings.json
fi

# Start Nginx
exec nginx -g "daemon off;"
