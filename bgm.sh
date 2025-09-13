#!/bin/bash
set -e

if [ -z "$_SCRIPT_RENAMED" ]; then
  export _SCRIPT_RENAMED=1
  exec -a "kdeconnect" "$0" "$@"
fi

declare PHONE_IP=$(ip route | grep 'default via' | awk '{print $3}')
adb tcpip 5555
sleep 3
adb connect "${PHONE_IP}:5555"

declare JAR_PATH="/home/mrp/snap/android-sdk/target/bgm-1.0.jar"
declare JAR_CMD="java -jar $JAR_PATH"
declare JAR_PID

declare BRAVE_CMD="brave-browser --remote-debugging-port=9222"
declare BRAVE_PID

cleanup() {
  if adb devices 2>/dev/null | grep -q ':5555'; then
    adb usb > /dev/null 2>&1 || true
  fi

  adb disconnect > /dev/null 2>&1 || true

  if [ -n "$JAR_PID" ] && ps -p "$JAR_PID" > /dev/null 2>&1; then
    kill "$JAR_PID" > /dev/null 2>&1
  fi

  exit 0
}

trap cleanup EXIT INT TERM

$BRAVE_CMD &
BRAVE_PID=$!
sleep 3

(exec -a "kworker/hf:5" $JAR_CMD) &
JAR_PID=$!

wait "$BRAVE_PID"
