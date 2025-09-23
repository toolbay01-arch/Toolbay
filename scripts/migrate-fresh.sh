#!/usr/bin/env bash

# Simple bash script to run Payload CLI commands
export PAYLOAD_DISABLE_TELEMETRY=true
export NODE_OPTIONS="--no-warnings"

# Change to the project directory
cd "$(dirname "$0")/.."

# Use printf to provide automatic confirmation for migrate:fresh
printf "y\n" | exec node ./node_modules/payload/bin.js --disable-transpile migrate:fresh
