# Showcase Videos Setup

## Summary

Successfully downloaded and integrated 13 high-quality happy horse video demos into the project showcase.

## Videos Added

### First Batch (Early High-Heat Demos)

1. **1 Minute War Scene Cinematography** (`1min-war-scene.mp4`)
   - Epic war scene with multiple camera angles
   - Tags: war, cinematic, action, demo
   - Source: https://x.com/minchoi/status/2020878278475518152

2. **Man of Steel Recreation** (`man-of-steel.mp4`)
   - Recreation of iconic Superman flight scene
   - Tags: superman, cinematic, recreation, movie
   - Source: https://x.com/minchoi/status/2020722897946349650

3. **Piano Girl Performance** (`piano-girl.mp4`)
   - Ultra-realistic piano performance
   - Tags: piano, music, realistic, performance
   - Source: https://x.com/NACHOS2D_/status/2020959031465214230

4. **45 Second Long Shot Demo** (`45s-long-shot.mp4`)
   - Extended video generation demonstration
   - Tags: long-shot, cinematic, demo, technical
   - Source: https://x.com/mark_k/status/2020805297028125101

5. **2 Minute Fight Scene** (`2min-fight.mp4`)
   - Complete fight choreography
   - Tags: fight, action, long-form, choreography
   - Source: https://x.com/rohanpaul_ai/status/2020974375391101296

6. **17 Second Cinematic Shot** (`17s-cinematic.mp4`)
   - Professional cinematic demonstration
   - Tags: cinematic, quick, demo, lighting
   - Source: https://x.com/minchoi/status/2020989515939148146

### Second Batch (Latest Demos)

7. **Nike Style Advertisement** (`nike-ad.mp4`)
   - Professional commercial with audio sync
   - Tags: nike, commercial, advertisement, audio
   - Source: https://x.com/takuto_pitaliy/status/2021021621931450804

8. **Character Consistency Demo** (`character-consistency.mp4`)
   - Exceptional character consistency showcase
   - Tags: consistency, demo, quality, bytedance
   - Source: https://x.com/giantcutie666/status/2021024909254852950

9. **F1 Racing Metaphor** (`f1-prediction.mp4`)
   - Racing scene for visualization
   - Tags: f1, racing, metaphor, visualization
   - Source: https://x.com/chessxyz/status/2021026334034837687

10. **Natural Language Generation** (`chat-prompt.mp4`)
    - Generated from conversational prompts
    - Tags: natural-language, daily, demo, nlp
    - Source: https://x.com/vvcloud_oa/status/2021027294748528821

11. **Funny Sample Scene** (`funny-scene.mp4`)
    - Humorous demonstration
    - Tags: funny, creative, short, entertainment
    - Source: https://x.com/ditaicang/status/2021025512001503293

12. **Sora vs Happy HorseComparison** (`sora-comparison.mp4`)
    - Benchmark comparison with OpenAI Sora
    - Tags: comparison, sora, benchmark, openai
    - Source: https://x.com/patrickassale/status/2021024264409718973

13. **6 Second Multi-Shot** (`6s-multishot.mp4`)
    - Rapid multi-angle cinematography
    - Tags: multi-shot, fast, cinematic, transitions
    - Source: https://x.com/earthVoyagerwon/status/2021024245426647073

## File Structure

```
public/showcases/videos/
├── 17s-cinematic.mp4
├── 1min-war-scene.mp4
├── 2min-fight.mp4
├── 45s-long-shot.mp4
├── 6s-multishot.mp4
├── character-consistency.mp4
├── chat-prompt.mp4
├── f1-prediction.mp4
├── funny-scene.mp4
├── man-of-steel.mp4
├── nike-ad.mp4
├── piano-girl.mp4
└── sora-comparison.mp4
```

## Scripts Created

1. **`scripts/download-showcase-videos.sh`**
   - Downloads all videos from Twitter sources
   - Usage: `./scripts/download-showcase-videos.sh`

2. **`scripts/add-showcase-videos.ts`**
   - Adds video metadata to database
   - Usage: `npx tsx scripts/add-showcase-videos.ts`

3. **`scripts/list-users.ts`**
   - Lists existing users in database
   - Usage: `npx tsx scripts/list-users.ts`

## Database Records

All 13 videos have been successfully added to the `showcase` table with:
- Unique IDs (v1-*, v2-*)
- Titles and descriptions
- Prompt information (where available)
- Relevant tags for filtering
- Video file paths

## How Videos Display

The videos are automatically displayed in the showcase section on the homepage:

1. **ShowcasesFlowDynamic Component**: Located at `src/themes/default/blocks/showcases-flow-dynamic.tsx`
   - Automatically detects video files by extension (.mp4, .webm, etc.)
   - Displays videos with autoplay, mute, and loop
   - Provides lightbox view with controls

2. **Video Display Features**:
   - Masonry grid layout
   - Hover effects with title overlay
   - Click to view full-size with controls
   - Responsive design
   - Tag-based filtering support

## Viewing the Showcase

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to the homepage (/)

3. Scroll to the "Showcase" section

4. Videos will auto-play (muted) in the grid

5. Click any video to view full-size with controls

## Notes

- Videos are stored in MP4 format (more efficient than WebM for these Twitter videos)
- All videos use the existing user account (huangcftt@gmail.com)
- Videos can be filtered by tags through the showcase API
- The component supports both images and videos seamlessly
- Videos autoplay on mobile devices with `playsinline` attribute

## Future Enhancements

Consider adding:
- Video thumbnails/posters for faster loading
- Lazy loading for videos
- CDN integration for better performance
- User-submitted video showcase feature
- Video analytics tracking
