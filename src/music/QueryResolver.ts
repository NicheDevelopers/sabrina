import UrlValidator from "./UrlValidator.ts";

export enum QueryType {
  YT_SEARCH = "yt-search",
  YT_URL = "yt-url",
}

export interface ResolvedQuery {
  type: QueryType;
  payload: string;
}

export default class QueryResolver {
  static resolve(query: string): ResolvedQuery {
    const isUrl = UrlValidator.isValidHttpUrl(query);
    if (!isUrl) {
      return { type: QueryType.YT_SEARCH, payload: query };
    }

    const url = new URL(query);
    if (!UrlValidator.isValidYoutubeUrl(url)) {
      return { type: QueryType.YT_SEARCH, payload: query };
    }

    return { type: QueryType.YT_URL, payload: url.toString() };
  }
}