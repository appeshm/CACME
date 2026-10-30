#!/usr/bin/env bash
# Assembles the public website into _site/:
#   /                      11well landing page
#   /ldl-goal-navigator/   the tool (Epic launch URL: /ldl-goal-navigator/launch.html)
#   /src/                  engine modules the tool imports
#   /app/                  redirect for old links
set -euo pipefail
rm -rf _site
mkdir -p _site/ldl-goal-navigator _site/app
cp -r app/. _site/ldl-goal-navigator/
cp -r src _site/src
cp site/index.html _site/index.html
cp site/app-redirect.html _site/app/index.html
echo "11well.com" > _site/CNAME
echo "Built _site/"
