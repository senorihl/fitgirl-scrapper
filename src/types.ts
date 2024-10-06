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
    private readonly _updatedAt: null | Date = null;
    constructor(private _id: string, private _url: string, private _title: string, private _genres: string[] = [], updatedAt?: string | Date) {
        this._updatedAt = !updatedAt ? null : (typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt)
    }


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

    get updatedAt(): Date {
        return this._updatedAt;
    }

    public toString() {
        return `Post<id=${this.id}, url=${this.url}, title=${this.title}, title=${this.updatedAt.toJSON()}>`
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