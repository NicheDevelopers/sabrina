import UrlValidator from "./UrlValidator";

export enum QueryKind {
    YT_SEARCH = "yt-search",
    YT_URL = "yt-url",
}

export interface ParsedQuery {
    type: QueryKind;
    payload: string;
}

export default class QueryParser {
    public static parse(query: string): ParsedQuery {
        const isUrl = UrlValidator.isValidHttpUrl(query);
        if (!isUrl) {
            return { type: QueryKind.YT_SEARCH, payload: query };
        }

        const url = new URL(query);
        if (!UrlValidator.isValidYoutubeUrl(url)) {
            return { type: QueryKind.YT_SEARCH, payload: query };
        }

        return { type: QueryKind.YT_URL, payload: url.toString() };
    }
}
