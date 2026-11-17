# BOREAL

A scroll-driven aurora site. Two AI-generated clips, an aurora and the sun, play frame by frame as you scroll, with a Three.js particle overlay and a science-style HUD.

## Why it exists

My second frame-scrub site. I wanted to test whether AI image-to-video could produce the footage: give it a start frame and an end frame, get a clip back.

## How it works

- **Clip generation.** `generate-videos.py` uploads a start and an end image to a temporary public host, submits a Kling 3.0 image-to-video job through the kie.ai API, polls until it finishes (10 to 15 minutes), and downloads the MP4. The clips were then extracted to JPEG frames (121 aurora, 61 solar).
- **Two clips, one timeline.** Aurora frames cover most of the scroll. The solar clip takes over from 66% to 90%, then hands back.
- **Section system.** Each section declares `data-enter`, `data-leave` and `data-animation`. Stats count up, a marquee slides with scroll, a dark overlay sits behind the stats, the hero exits with a circle wipe, and headings scramble in.
- **HUD.** Altitude, Kp index, solar wind and the 557.7 nm oxygen line change per chapter. The values are scripted per chapter, not live data.
- **Particles.** A transparent Three.js canvas with an orthographic camera draws scroll-driven particle systems over the frames.

## Stack

Vanilla HTML, CSS and JS. Lenis, GSAP ScrollTrigger and Three.js r160 from CDNs. Python 3 (standard library plus `python-dotenv`) for clip generation. Netlify config included.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

Regenerating a clip uses a paid API. Set `KIE_AI_API_KEY` in `.env`, then:

```bash
python3 generate-videos.py aurora aurora-start.png aurora-end.png
```

## Status and known limits

Finished study. The four keyframe PNGs (about 33 MB) are committed alongside ~54 MB of frames.

## Credits

Built with Nate Herk's video-to-website Claude Code skill (loader, section animation system, marquee, counters, circle wipe). The AI clip generation, two-clip switching, particle layer and HUD are my additions.
Ambient audio: "Aurora" by LogicMoon on Freesound, licensed CC BY-NC 4.0.
