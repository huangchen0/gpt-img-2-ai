export interface ShareContent {
  shareUrl: string;
  imageUrl: string;
  title: string;
  description: string;
  appName: string;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildShareArtifacts({
  shareUrl,
  imageUrl,
  title,
  description,
  appName,
}: ShareContent) {
  const shareText = description.trim() || title.trim();
  const imageAlt = title || description || 'AI generated image';
  const markdown = `![${imageAlt}](${imageUrl})\n\nCreated with [${appName}](${shareUrl})`;
  const embedHtml = `<a href="${shareUrl}" target="_blank" rel="noopener">\n  <img src="${imageUrl}" alt="${escapeHtml(imageAlt)}" />\n</a>\n<p>Created with <a href="${shareUrl}" target="_blank" rel="noopener">${escapeHtml(appName)}</a></p>`;

  return {
    shareText,
    imageAlt,
    markdown,
    embedHtml,
  };
}

export function buildSharePlatformUrls({
  shareUrl,
  imageUrl,
  title,
  description,
}: Omit<ShareContent, 'appName'>) {
  const shareText = description.trim() || title.trim();
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedImageUrl = encodeURIComponent(imageUrl);
  const encodedShareText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title || shareText);

  return {
    pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodedShareUrl}&media=${encodedImageUrl}&description=${encodedShareText}`,
    x: `https://twitter.com/intent/tweet?url=${encodedShareUrl}&text=${encodedShareText}`,
    weibo: `https://service.weibo.com/share/share.php?url=${encodedShareUrl}&title=${encodedShareText}&pic=${encodedImageUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedShareUrl}&title=${encodedTitle}`,
  };
}
