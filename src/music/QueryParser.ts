import * as UrlValidator from "./UrlValidator";

export const QueryKind = {
  YT_SEARCH: "yt-search",
  YT_URL: "yt-url",
  YT_PLAYLIST: "yt-playlist",
} as const;

export type QueryKind = (typeof QueryKind)[keyof typeof QueryKind];

export interface ParsedQuery {
  type: QueryKind;
  payload: string;
}

export function parse(query: string): ParsedQuery {
  const isUrl = UrlValidator.isValidHttpUrl(query);
  if (!isUrl) {
    return { type: QueryKind.YT_SEARCH, payload: query };
  }

  const url = new URL(query);
  if (!UrlValidator.isValidYoutubeUrl(url)) {
    return { type: QueryKind.YT_SEARCH, payload: query };
  }

  if (UrlValidator.isPlaylistUrl(url)) {
    const listParam = url.searchParams.get("list")!;
    return { type: QueryKind.YT_PLAYLIST, payload: listParam };
  }

  return { type: QueryKind.YT_URL, payload: url.toString() };
}
