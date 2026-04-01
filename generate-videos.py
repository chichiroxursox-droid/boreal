#!/usr/bin/env python3
"""
BOREAL — Video generator via Kling 3.0 (kie.ai API)
Usage:
  python3 generate-videos.py aurora aurora-start.png aurora-end.png
  python3 generate-videos.py solar solar-start.png solar-end.png
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path.home() / ".nano-banana" / ".env")
load_dotenv()

API_KEY  = os.getenv("KIE_AI_API_KEY")
BASE_URL = "https://api.kie.ai/api/v1"


def upload_image(local_path):
    """Upload a local image to 0x0.st and return the public URL."""
    print(f"  Uploading {local_path} → 0x0.st ...", file=sys.stderr)
    result = subprocess.run(
        ["curl", "-s", "-F", f"file=@{local_path}", "https://0x0.st"],
        capture_output=True, text=True, timeout=60
    )
    url = result.stdout.strip()
    if not url.startswith("http"):
        print(f"Upload failed: {result.stdout} {result.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"  → {url}", file=sys.stderr)
    return url


def submit_kling(image_url_start, image_url_end, label):
    """Submit a Kling 3.0 image-to-video task."""
    url = f"{BASE_URL}/jobs/createTask"
    payload = json.dumps({
        "model": "kling-3.0/video",
        "input": {
            "image_urls": [image_url_start, image_url_end],
            "multi_shots": False,
        }
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())

    if data.get("code") != 200:
        print(f"Kling API error: {data}", file=sys.stderr)
        sys.exit(1)

    task_id = data["data"]["taskId"]
    print(f"  Kling task submitted: {task_id}", file=sys.stderr)
    return task_id


def poll_kling(task_id, timeout=1200):
    """Poll for Kling task completion (10–15 min typical)."""
    url = f"{BASE_URL}/jobs/recordInfo?taskId={task_id}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {API_KEY}"})
    deadline = time.time() + timeout

    print("  Polling for completion (may take 10–15 min)...", file=sys.stderr)
    while time.time() < deadline:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        state = data.get("data", {}).get("state", "")
        if state == "success":
            result_json = data["data"].get("resultJson", "{}")
            result = json.loads(result_json)
            urls = result.get("resultUrls", [])
            if urls:
                return urls[0]
            print("No result URLs in response.", file=sys.stderr)
            sys.exit(1)
        elif state == "fail":
            msg = data["data"].get("failMsg", "unknown")
            print(f"Kling task failed: {msg}", file=sys.stderr)
            sys.exit(1)
        else:
            progress = data.get("data", {}).get("progress", 0)
            elapsed  = int(time.time() - (deadline - timeout))
            print(f"  [{elapsed}s] Status: {state} ({progress}%)...", file=sys.stderr)
            time.sleep(20)

    print("Timed out waiting for Kling.", file=sys.stderr)
    sys.exit(1)


def download_file(url, out_path):
    """Download a file from URL to local path."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        with open(out_path, "wb") as f:
            f.write(r.read())
    print(f"  Saved → {out_path}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Generate BOREAL video clips via Kling 3.0")
    parser.add_argument("clip",   choices=["aurora", "solar"], help="Which clip to generate")
    parser.add_argument("start",  help="Path to start frame image")
    parser.add_argument("end",    help="Path to end frame image")
    args = parser.parse_args()

    if not API_KEY:
        print("Error: KIE_AI_API_KEY not set in ~/.nano-banana/.env", file=sys.stderr)
        sys.exit(1)

    print(f"\n=== Generating {args.clip.upper()} video ===", file=sys.stderr)

    # 1. Upload images to get public URLs
    url_start = upload_image(args.start)
    url_end   = upload_image(args.end)

    # 2. Submit to Kling 3.0
    task_id = submit_kling(url_start, url_end, args.clip)

    # 3. Poll to completion
    video_url = poll_kling(task_id)
    print(f"\n  Video ready: {video_url}", file=sys.stderr)

    # 4. Download MP4
    out_mp4 = f"{args.clip}.mp4"
    download_file(video_url, out_mp4)
    print(out_mp4)  # stdout: the path


if __name__ == "__main__":
    main()
