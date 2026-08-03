/* ============================================================================
   YouTube link → embed URL.

   Admins paste whatever YouTube hands them: a share link (youtu.be/ID), a
   desktop watch URL, or — increasingly — a Shorts link, since that is what the
   mobile app produces. All of those point at the same video and must embed.

   Anything that isn't a single video (a channel, playlist, @handle or user
   page) resolves to '' so the caller simply omits its video section rather than
   rendering a player that can't load.
   ========================================================================= */

/** A YouTube video id is always 11 URL-safe characters. */
const VIDEO_ID = /^[\w-]{11}$/;

/** Path prefixes that carry the video id as the next segment. */
const ID_IN_PATH = new Set(['shorts', 'embed', 'live', 'v', 'e']);

/** Extract the 11-character video id from any YouTube URL form, or ''. */
export function youtubeId(url?: string | null): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';

  let parsed: URL;
  try {
    // Tolerate a missing scheme ("youtu.be/abc") — admins paste these too.
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return '';
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const parts = parsed.pathname.split('/').filter(Boolean);
  let id = '';

  if (host === 'youtu.be') {
    id = parts[0] ?? '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') id = parsed.searchParams.get('v') ?? '';
    else if (parts[0] && ID_IN_PATH.has(parts[0].toLowerCase())) id = parts[1] ?? '';
  }

  return VIDEO_ID.test(id) ? id : '';
}

/** Privacy-friendly embed URL for a YouTube link, or '' when it isn't a video. */
export function youtubeEmbed(url?: string | null): string {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : '';
}
