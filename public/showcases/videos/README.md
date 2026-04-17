# Showcase Videos Directory

This directory previously contained local showcase video files.

## Current Status

All showcase videos have been migrated to **Cloudflare R2 CDN** for better performance and global distribution.

## CDN Information

- **CDN URL**: `https://cdn.gptimg2.art`
- **Storage Path**: `uploads/showcases/`
- **Total Videos**: 12 showcase videos

## Benefits of R2 CDN

✅ **Global CDN acceleration** - Fast loading worldwide
✅ **Zero egress fees** - No bandwidth charges from Cloudflare
✅ **High availability** - 99.9% uptime SLA
✅ **HTTPS secure** - Encrypted video delivery
✅ **Scalable** - Handles traffic spikes automatically

## Video Management

To manage showcase videos:

1. **View videos**: Check the homepage showcase section
2. **Upload new videos**: Use `scripts/upload-showcase-videos-to-r2.ts`
3. **Verify URLs**: Run `npx tsx scripts/verify-showcase-urls.ts`
4. **Delete videos**: Use `scripts/delete-showcase-video.ts`

## Database Records

All video URLs are stored in the `showcase` table with R2 CDN URLs:
```
https://cdn.gptimg2.art/uploads/showcases/[timestamp]-[filename].mp4
```

## Local Development

During local development, all videos are served directly from R2 CDN. No local files needed.

## Notes

- Local video files have been removed to save space (11MB saved)
- All videos are safely backed up on R2 storage
- This directory can be kept for future local video uploads if needed
- Videos are automatically displayed on the homepage showcase section

---

Last updated: 2025-02-10
Migration completed: ✅ All videos on R2 CDN
