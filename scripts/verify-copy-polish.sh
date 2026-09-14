#!/usr/bin/env bash
# Live-browser verification of the production copy polish pass.
# Starts `next start`, walks the key pages, screenshots each, checks that
# removed meta-texts are gone, then shuts the server down.
set -u
cd "$(dirname "$0")/.." || exit 1

export DATABASE_URL='postgres://postgres.vktvkuyvphyexfbdtazy:9oEPtAn5ecUcJC19@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x'
OUT=/home/z/my-project/download

pkill -f "next start" 2>/dev/null
sleep 1

bunx next start -p 3100 > server-verify.log 2>&1 &
SERVER_PID=$!

# Wait for readiness
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/ 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "server ready (code=$code)"

agent-browser close >/dev/null 2>&1
agent-browser set viewport 1440 900 >/dev/null

pages=(/ /war /capital /hall-of-fame /strategy /members /offline)
names=(dashboard war capital hall-of-fame strategy members offline)
for i in "${!pages[@]}"; do
  agent-browser open "http://localhost:3100${pages[$i]}" >/dev/null
  agent-browser wait 2500 >/dev/null
  agent-browser screenshot "$OUT/verify-${names[$i]}.png" >/dev/null
  echo "shot: ${names[$i]}"
done

# Text assertions on rendered pages
agent-browser open http://localhost:3100/ >/dev/null
agent-browser wait 2500 >/dev/null
DASH_HTML=$(agent-browser eval "document.body.innerText" 2>/dev/null)
echo "--- dashboard text checks ---"
for bad in "tracker" "daily batch" "between updates" "GitHub Actions" "Requires W/T/L" "captured"; do
  if echo "$DASH_HTML" | grep -qi "$bad"; then echo "STILL PRESENT: $bad"; else echo "clean: $bad"; fi
done
for good in "Records updated" "Tracked since" "War updated" "Clan Pulse"; do
  if echo "$DASH_HTML" | grep -q "$good"; then echo "present: $good"; else echo "MISSING: $good"; fi
done

echo "--- strategy page ---"
agent-browser open http://localhost:3100/strategy >/dev/null
agent-browser wait 2000 >/dev/null
S_HTML=$(agent-browser eval "document.body.innerText" 2>/dev/null)
if echo "$S_HTML" | grep -qi "Automatic ranking"; then echo "STILL PRESENT: page description"; else echo "clean: page description removed"; fi
if echo "$S_HTML" | grep -qi "backfilled wars lack"; then echo "STILL PRESENT: targeting footnote"; else echo "clean: targeting footnote removed"; fi

echo "--- hall of fame ---"
agent-browser open http://localhost:3100/hall-of-fame >/dev/null
agent-browser wait 2000 >/dev/null
H_HTML=$(agent-browser eval "document.body.innerText" 2>/dev/null)
if echo "$H_HTML" | grep -qi "Cached awards"; then echo "STILL PRESENT: cached-awards stamp"; else echo "clean: freshness stamp"; fi

echo "--- console errors ---"
agent-browser errors

agent-browser close >/dev/null 2>&1
kill $SERVER_PID 2>/dev/null
pkill -f "next start" 2>/dev/null
echo "done"
