#!/usr/bin/env bash
# Rebuilds every FLAMYNGo teaser video into ../assets/video/.
# Needs: node + playwright (Chromium), python3 + numpy, ffmpeg ($FFMPEG or PATH).
#   pip install numpy imageio-ffmpeg && export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
WORK="${WORK:-$(mktemp -d)}"
OUT=../assets/video
mkdir -p "$OUT/posters"

# 1. silent renders (skipped when already present in $WORK)
for tl in teaser physical digital live; do
  [ -s "$WORK/$tl-silent.mp4" ] || FFMPEG="$FFMPEG" node render.mjs "$tl" "$WORK/$tl-silent.mp4" 30
done

# 2. soundtrack (scene cuts must match TIMELINES in film.html)
python3 music.py 75 0,7.5,20,30,42.5,55,67.5 "$WORK/teaser.wav" --drop-drums-at 67.5
python3 music.py 15 0,12.5 "$WORK/clip.wav"

# 3. web encodes: teaser at 1080p, carousel clips at 720p
enc() { # in wav out scale crf
  "$FFMPEG" -y -loglevel error -i "$1" -i "$2" -map 0:v -map 1:a -vf "scale=$4:flags=lanczos" \
    -c:v libx264 -preset slow -crf "$5" -profile:v high -pix_fmt yuv420p \
    -af "loudnorm=I=-18:TP=-1.5:LRA=11" -c:a aac -b:a 128k -ar 44100 -shortest -movflags +faststart "$3"
}
enc "$WORK/teaser-silent.mp4" "$WORK/teaser.wav" "$OUT/flamyngo-teaser.mp4" 1920:1080 24
for tl in physical digital live; do
  enc "$WORK/$tl-silent.mp4" "$WORK/clip.wav" "$OUT/flamyngo-$tl.mp4" 1280:720 25
done

# 3b. vertical TikTok cut (1080x1920, 128 BPM, louder master for mobile)
[ -s "$WORK/tiktok-silent.mp4" ] || PAGE=tiktok.html FFMPEG="$FFMPEG" node render.mjs tiktok "$WORK/tiktok-silent.mp4" 30
python3 music.py tiktok "$WORK/tiktok.wav"
"$FFMPEG" -y -loglevel error -i "$WORK/tiktok-silent.mp4" -i "$WORK/tiktok.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=9" -c:a aac -b:a 160k -ar 44100 -shortest -movflags +faststart "$OUT/flamyngo-tiktok.mp4"

# 4. posters (a frame where the scene is fully built)
poster() { "$FFMPEG" -y -loglevel error -ss "$2" -i "$1" -frames:v 1 -vf scale=1280:720 -q:v 4 "$3"; }
poster "$OUT/flamyngo-teaser.mp4" 6.9 "$OUT/posters/teaser.jpg"
poster "$OUT/flamyngo-physical.mp4" 11.5 "$OUT/posters/physical.jpg"
poster "$OUT/flamyngo-digital.mp4" 11.8 "$OUT/posters/digital.jpg"
poster "$OUT/flamyngo-live.mp4" 11.5 "$OUT/posters/live.jpg"
ls -la "$OUT" "$OUT/posters"
