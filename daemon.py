import subprocess
import time
import sys
import os

PID_FILE = "app.pid"
LOG_FILE = "app.log"

def start_daemon():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            os.kill(pid, 0)
            print(f"FlixBox is already running with PID {pid}")
            return
        except (OSError, ValueError):
            pass

    cmd = [sys.executable, "-u", "app.py"]
    with open(LOG_FILE, "a") as log:
        proc = subprocess.Popen(
            cmd,
            stdout=log,
            stderr=log,
            stdin=subprocess.DEVNULL,
            start_new_session=True
        )
    with open(PID_FILE, "w") as f:
        f.write(str(proc.pid))
    print(f"FlixBox daemon started with PID {proc.pid}")

if __name__ == "__main__":
    start_daemon()
