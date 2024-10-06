import {program} from "commander";
import chalk from "chalk";
import { parse } from 'node-html-parser';
import {FileHandle, open, writeFile} from "node:fs/promises";
import { EOL } from "node:os";
import {resolve} from "node:path";
import process from "node:process";
import {isSitemapIndex, isSitemapUrl, Post} from "./types";
import {parseCascadingSitemaps} from "./sitemap";

program
    .option('-u, --url <url>', 'The fitgirl-repacks sitemap URL to use', 'https://fitgirl-repacks.site/sitemap_index.xml')
    .option('-s, --since <timestamp>', 'The timestamp before anything will not be included, useful for refreshing data')
    .option('--json <output>', 'JSON file in which data will be written')
    .option('--csv <output>', 'CSV file in which data will be written')
    .option('--append', 'To append instead of creating/emptying the CSV file')
;

program.parse();

const {url, json, csv, append, since} = program.opts() as Partial<{url: string, json: string, csv: string, since: string, append: boolean}>;

const notBefore = !since ? null : new Date(since);

const onParsed: Array<(post: Post) => PromiseLike<void>> = [
    async (post) => {
        console.log(`${post}`)
    }
];

function sleep(ms: number): Promise<void> {
    return new Promise((res) => {
        setTimeout(() => {
            res();
        }, ms);
    })
}

const callback =  async ({loc, lastmod}, retry = false) => {
    await sleep(500);
    try {
        const body = await (await fetch(loc)).text();

        if (!isSitemapIndex(body) && !isSitemapUrl(body)) {
            const root = parse(body);
            const articles = root.querySelectorAll('article');

            for (const article of articles) {
                const id = article.getAttribute('id').startsWith('post-') ? article.getAttribute('id').substring(5) : null;

                if (null === id) {
                    console.log(chalk.grey(`Skipping post due to missing id`))
                    continue;
                }

                lastmod = !lastmod ? null : new Date(lastmod);

                if (notBefore !== null && lastmod === null) {
                    console.log(chalk.grey(`Skipping post due to missing lastmod`))
                    continue;
                }

                if (notBefore !== null && lastmod !== null && lastmod < notBefore) {
                    console.log(chalk.grey(`Skipping post due to lastmod ${lastmod.toJSON()} < ${notBefore.toJSON()}`))
                    continue;
                }

                const title = article.querySelector('h1')?.textContent;
                const url = article.querySelector('h1')?.querySelector('a') ? article.querySelector('h1').querySelector('a').getAttribute('href') : loc;
                const genres = article.querySelectorAll('p')
                    .filter(p => p.textContent.indexOf('Genres/Tags') > -1)
                    .map(p => parse(p.innerHTML.split('Genres/Tags')[1]).querySelector('strong').textContent.split(',').map(e => e.trim()))
                    .reduce((previousValue, currentValue) => {
                        return [...previousValue, ...currentValue];
                    }, []);

                for (const parsedCallback of onParsed) {
                    await parsedCallback(new Post(id, url, title, genres, lastmod));
                }
            }
        }
    } catch (e) {
        if (!retry) await callback({loc, lastmod}, true);
    }
};

let jsonFd: FileHandle, csvFd: FileHandle;

async function signalHandler(signal: NodeJS.Signals) {
    if (jsonFd) {
        await writeFile(jsonFd, EOL + ']');
        console.log(chalk.grey('Closing JSON file'));
        await jsonFd.close();
    }
    if (csv) {
        console.log(chalk.grey('Closing CSV file'));
        await csvFd.close();
    }
    process.exit()
}

process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
process.on('SIGQUIT', signalHandler);

(async (url) => {

    if (json) {
        let count = 0;
        jsonFd = await open(resolve(process.cwd(), json), 'w');
        await writeFile(jsonFd, '[');

        onParsed.push(async (post) => {
            let str = EOL + "\t" + JSON.stringify({id: post.id, url: post.url, title: post.title, updatedAt: post.updatedAt?.toJSON() || null, genres: post.genres } );
            if (count > 0) {
                str = "," + str;
            }

            try {
                await writeFile(jsonFd, str);
                count++;
            } finally {}
        })
    }

    if (csv) {
        csvFd = await open(resolve(process.cwd(), csv), append ? 'a' : 'w');
        append || await writeFile(csvFd, '"' + ['id', 'url', 'title', 'updatedAt', 'genres'].join('","') + '"');

        onParsed.push(async (post) => {
            await writeFile(csvFd, EOL + '"' + [post.id, post.url, post.title,post.updatedAt?.toJSON() || null, ...(post.genres.length > 0 ? post.genres : ['N/A'])].join('","') + '"');
        })
    }

    try {
        await parseCascadingSitemaps(url, callback);
    } finally {
        signalHandler('SIGQUIT');
    }
})(url);