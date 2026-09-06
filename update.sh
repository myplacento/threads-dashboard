#!/bin/bash
# Threads dashboard auto-update: Zernio (30min detail) + Official Meta API (app-accurate views)
cd /home/ubuntu/threads-dashboard || exit 1

python3 fetch_data.py > /tmp/dash_fetch.log 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️ DASHBOARD FETCH FAIL (Zernio)"
  tail -5 /tmp/dash_fetch.log
  exit 1
fi

python3 fetch_threads_official.py >> /tmp/dash_fetch.log 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️ DASHBOARD FETCH FAIL (Meta official)"
  tail -5 /tmp/dash_fetch.log
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  exit 0   # no change -> silent
fi

TOKEN=$(cat .gh_token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "⚠️ DASHBOARD: token hilang (.gh_token)"
  exit 1
fi

git add data/data.json
git commit -q -m "data refresh $(date -u +%FT%TZ)" || true
if ! git push -q "https://x-access-token:${TOKEN}@github.com/myplacento/threads-dashboard.git" main 2>/tmp/dash_push.log; then
  echo "⚠️ DASHBOARD PUSH FAIL"
  tail -3 /tmp/dash_push.log
  exit 1
fi
# silent on success (watchdog pattern)
exit 0
