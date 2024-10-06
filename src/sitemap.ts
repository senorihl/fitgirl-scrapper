import {XMLParser} from "fast-xml-parser";
import chalk from "chalk";
import {isSitemapIndex, isSitemapUrl, LocEntry} from "./types";

export async function parseCascadingSitemaps(url: string, onURL: (entry: LocEntry) => Promise<void>, parser?: XMLParser) {
    parser = parser || new XMLParser();
    const res = await fetch(url);
    const root = parser.parse(await res.text());

    if (isSitemapIndex(root)) {
        const sitemaps = Array.isArray(root.sitemapindex.sitemap) ? root.sitemapindex.sitemap : [root.sitemapindex.sitemap];
        for (const {loc} of sitemaps) {
            await parseCascadingSitemaps(loc, onURL, parser);
        }
    } else if (isSitemapUrl(root)) {
        if (url.indexOf('post-sitemap') === -1) {
            console.warn(chalk.red.bold(`Invalid sitemap name for ${url}, it must include \`post-sitemap\`.`));
            return;
        }
        const urls = Array.isArray(root.urlset.url) ? root.urlset.url : [root.urlset.url];
        for (const entry of urls) {
            await onURL(entry)
        }
    } else {
        console.warn(chalk.red.bold(`Invalid sitemap content for ${url}`));
    }
}