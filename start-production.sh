#!/bin/bash
# 霈霈看板 Production Server
cd "$(dirname "$0")"
exec npx next start -H 0.0.0.0 -p 3000
