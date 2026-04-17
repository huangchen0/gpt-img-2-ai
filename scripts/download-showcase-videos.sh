#!/bin/bash

# Create directory for downloaded videos
mkdir -p public/showcases/videos

echo "Starting video downloads..."
echo "========================================"

# First batch (early high-heat demos)

# 1. 1 Minute War Scene
echo "Downloading: 1 Minute War Scene"
curl -L -o "public/showcases/videos/1min-war-scene.mp4" \
  "https://video.twimg.com/amplify_video/2020875492115816448/vid/avc1/480x270/ZI1P-ZEOyXCrwm6K.mp4"
echo "✓ Downloaded 1min-war-scene.mp4"
echo ""

# 2. Man of Steel
echo "Downloading: Man of Steel Recreation"
curl -L -o "public/showcases/videos/man-of-steel.mp4" \
  "https://video.twimg.com/amplify_video/2020722719323832320/vid/avc1/320x400/aZDHZist20wATAgC.mp4"
echo "✓ Downloaded man-of-steel.mp4"
echo ""

# 3. Piano Girl
echo "Downloading: Piano Girl Performance"
curl -L -o "public/showcases/videos/piano-girl.mp4" \
  "https://video.twimg.com/amplify_video/2020954876704858112/vid/avc1/480x270/7Z6Tv-EmHwDif_bM.mp4"
echo "✓ Downloaded piano-girl.mp4"
echo ""

# 4. 45 Second Long Shot
echo "Downloading: 45 Second Long Shot Demo"
curl -L -o "public/showcases/videos/45s-long-shot.mp4" \
  "https://video.twimg.com/amplify_video/2020546625979211776/vid/avc1/480x270/ii9fPEM6GNI2unL9.mp4"
echo "✓ Downloaded 45s-long-shot.mp4"
echo ""

# 5. 2 Minute Fight
echo "Downloading: 2 Minute Fight Scene"
curl -L -o "public/showcases/videos/2min-fight.mp4" \
  "https://video.twimg.com/amplify_video/2020522631204835328/vid/avc1/630x270/CCOzMFg6_3arvsvo.mp4"
echo "✓ Downloaded 2min-fight.mp4"
echo ""

# 6. 17 Second Cinematic
echo "Downloading: 17 Second Cinematic Shot"
curl -L -o "public/showcases/videos/17s-cinematic.mp4" \
  "https://video.twimg.com/amplify_video/2020983311808724992/vid/avc1/482x270/kA8np3jjB_tuD4sv.mp4"
echo "✓ Downloaded 17s-cinematic.mp4"
echo ""

# Second batch (latest)

# 7. Nike Ad
echo "Downloading: Nike Style Advertisement"
curl -L -o "public/showcases/videos/nike-ad.mp4" \
  "https://video.twimg.com/amplify_video/2020053177555644418/vid/avc1/480x270/d1RUyCnQx-cAMOfB.mp4"
echo "✓ Downloaded nike-ad.mp4"
echo ""

# 8. Character Consistency
echo "Downloading: Character Consistency Demo"
curl -L -o "public/showcases/videos/character-consistency.mp4" \
  "https://video.twimg.com/ext_tw_video/2021024875692032001/pu/vid/avc1/320x426/Qf1OR5Fomp4nOeid.mp4"
echo "✓ Downloaded character-consistency.mp4"
echo ""

# 9. F1 Racing
echo "Downloading: F1 Racing Metaphor"
curl -L -o "public/showcases/videos/f1-prediction.mp4" \
  "https://video.twimg.com/amplify_video/2020881475886014465/vid/avc1/480x270/f1bhEzticpcZ773F.mp4"
echo "✓ Downloaded f1-prediction.mp4"
echo ""

# 10. Chat Prompt
echo "Downloading: Natural Language Generation"
curl -L -o "public/showcases/videos/chat-prompt.mp4" \
  "https://video.twimg.com/amplify_video/2021027194714324998/vid/avc1/480x270/0hy8u_FIj6T_dzzS.mp4"
echo "✓ Downloaded chat-prompt.mp4"
echo ""

# 11. Funny Scene
echo "Downloading: Funny Sample Scene"
curl -L -o "public/showcases/videos/funny-scene.mp4" \
  "https://video.twimg.com/amplify_video/2020914189062008832/vid/avc1/320x568/feSVNm4kneIkZT6U.mp4"
echo "✓ Downloaded funny-scene.mp4"
echo ""

# 12. Sora Comparison
echo "Downloading: Sora vs Happy HorseComparison"
curl -L -o "public/showcases/videos/sora-comparison.mp4" \
  "https://video.twimg.com/amplify_video/2021023040235241477/vid/avc1/480x270/TT3A3c0hgmK1HJtF.mp4"
echo "✓ Downloaded sora-comparison.mp4"
echo ""

# 13. 6 Second Multi-Shot
echo "Downloading: 6 Second Multi-Shot"
curl -L -o "public/showcases/videos/6s-multishot.mp4" \
  "https://video.twimg.com/amplify_video/2021024136815050754/vid/avc1/476x270/WcguK5s-vxTInoxf.mp4"
echo "✓ Downloaded 6s-multishot.mp4"
echo ""

echo "========================================"
echo "✓ All downloads complete!"
echo ""
echo "Videos saved to: public/showcases/videos/"
echo ""
echo "Next step: Convert to WebM format"
echo "Run: python ~/.claude/skills/media-converter/scripts/convert_videos.py public/showcases/videos -r"
