const validHosts = new Set([
  "www.youtube.com",
  "youtu.be",
  "music.youtube.com",
  "youtube.com",
  "m.youtube.com",
]);

export function isValidHttpUrl(string: string): boolean {
  try {
    const newUrl = new URL(string);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidYoutubeUrl(url: URL): boolean {
  return isValidHttpUrl(url.toString()) && validHosts.has(url.hostname);
}

export function isPlaylistUrl(url: URL): boolean {
  // Every playlist has a list parameter
  if (!url.searchParams.has("list")) {
    return false;
  }

  // If there is a list parameter and the host is not music.youtube.com,
  // it should be treated as a playlist
  if (url.hostname !== "music.youtube.com") {
    return true;
  }

  // If the host is music.youtube.com, the pathname should start with /playlist
  // We ignore the list parameter in this case (ignoring possible autoplay lists)
  return url.pathname.startsWith("/playlist");
}

export function extractVideoId(url: URL): string {
  if (!validHosts.has(url.hostname)) {
    throw new Error("Invalid host");
  }

  if (url.hostname === "youtu.be") {
    return url.pathname.split("/")[1];
  }

  // now its either www.youtube.com or music.youtube.com
  return url.searchParams.get("v")!;
}
