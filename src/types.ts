export type LocEntry = {
    loc: string,
    lastmod?: string
}

export type SitemapIndex = {
    sitemapindex: { sitemap: LocEntry | Array<LocEntry> }
}

export type SitemapUrl = {
    urlset : { url: LocEntry | Array<LocEntry> }
}

export class Post {
    constructor(private _id: string, private _url: string, private _title: string, private _genres: string[] = [], private _companies: string[] = [], private _updatedAt: Date = null) {}

    get id(): string {
        return this._id;
    }

    get url(): string {
        return this._url;
    }

    get title(): string {
        return this._title;
    }

    get genres(): string[] {
        return this._genres;
    }

    get companies(): string[] {
        return this._genres;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    public toString() {
        return `Post<id=${this.id.padEnd(6)}, lastmod=${this.updatedAt.toJSON()}, url=${this.url}>`
    }
}

export function isLocEntry(entry: any): entry is LocEntry {
    return typeof entry?.loc === 'string' && (typeof entry?.lastmod === 'string' || typeof entry?.lastmod === 'undefined');
}

export function isSitemapIndex(obj: any): obj is SitemapIndex {
    return isLocEntry(obj?.sitemapindex?.sitemap) || Array.isArray(obj?.sitemapindex?.sitemap) && obj.sitemapindex.sitemap.every(isLocEntry);
}

export function isSitemapUrl(obj: any): obj is SitemapUrl {
    return isLocEntry(obj?.urlset?.url) || Array.isArray(obj?.urlset?.url) && obj.urlset.url.every(isLocEntry);
}