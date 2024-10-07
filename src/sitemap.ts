import {XMLParser} from "fast-xml-parser";
import chalk from "chalk";
import {isSitemapIndex, isSitemapUrl, LocEntry} from "./types";

export async function parseCascadingSitemaps(url: string, onURL: (entry: LocEntry) => Promise<void>, parser?: XMLParser, notBefore?: Date) {
    parser = parser || new XMLParser();
    console.info(chalk.blue(`Fetching sitemap ${url}`), notBefore ? notBefore.toJSON() : '');
    const res = await fetch(url);
    const root = parser.parse(await res.text());

    if (isSitemapIndex(root)) {
        const sitemaps = (Array.isArray(root.sitemapindex.sitemap) ? root.sitemapindex.sitemap : [root.sitemapindex.sitemap]).filter(({lastmod}) => {
            const lastmodDate = !lastmod ? null : new Date(lastmod);
            if (!lastmodDate) return true;
            if (!notBefore) return true;
            return lastmodDate >= notBefore;
        });

        for (const {loc, lastmod} of sitemaps) {
            console.group(chalk.blue(`Fetching sitemap-index ${loc} (${lastmod})`));
            await parseCascadingSitemaps(loc, onURL, parser, notBefore);
            console.groupEnd();
        }
    } else if (isSitemapUrl(root)) {
        if (url.indexOf('post-sitemap') === -1) {
            console.warn(chalk.red.bold(`Invalid sitemap name for ${url}, it must include \`post-sitemap\`.`));
            return;
        }

        const urls = (Array.isArray(root.urlset.url) ? root.urlset.url : [root.urlset.url]).filter(({lastmod}) => {
            const lastmodDate = !lastmod ? null : new Date(lastmod);
            if (!lastmodDate) return true;
            if (!notBefore) return true;
            return lastmodDate >= notBefore;
        });

        for (const entry of urls) {
            console.group(chalk.blue(`Fetching ${entry.loc} (${entry.lastmod})`));
            await onURL(entry);
            console.groupEnd();
        }
    } else {
        console.warn(chalk.red.bold(`Invalid sitemap content for ${url}`));
    }
}