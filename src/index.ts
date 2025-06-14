import {program} from "commander";
import chalk from "chalk";
import {FileHandle, open, writeFile} from "node:fs/promises";
import { EOL } from "node:os";
import {resolve} from "node:path";
import process from "node:process";
import {Post} from "./types";
import {parseConsecutivePage} from "./section";

program
    .option('-u, --url <url>', 'The fitgirl-repacks sitemap URL to use', 'https://fitgirl-repacks.site/category/lossless-repack/')
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

let jsonFd: FileHandle, csvFd: FileHandle;

async function signalHandler(signal: NodeJS.Signals) {
    if (jsonFd) {
        await writeFile(jsonFd, EOL + ']');
        console.log(chalk.grey('Closing JSON file'));
        await jsonFd.close();

        if (append) {
            console.log(chalk.grey('Fixing appended JSON file'));
            const { replaceInFile } = await import('replace-in-file');
            await replaceInFile({
                files: resolve(process.cwd(), json),
                from: /}\s*]\[.*$/gm,
                to: '},',
            });
            await replaceInFile({
                files: resolve(process.cwd(), json),
                from: /},(\s*].*)$/gm,
                to: '}$1',
            });
        }
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
        jsonFd = await open(resolve(process.cwd(), json), append ? 'a' : 'w');
        await writeFile(jsonFd, '[');

        onParsed.push(async (post) => {
            let str = EOL + "\t" + JSON.stringify({
                id: post.id,
                url: post.url,
                title: post.title,
                updatedAt: post.updatedAt?.toJSON() || null,
                genres: post.genres,
                companies: post.companies,
            } );
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
            await writeFile(csvFd, EOL + '"' + [
                post.id,
                post.url,
                post.title,
                post.updatedAt?.toJSON() || null,
                ...(post.genres.length > 0 ? post.genres : ['N/A'])
            ].join('","') + '"');
        })
    }

    try {
        await parseConsecutivePage(url, async (post) => {
            for (const parsedCallback of onParsed) {
                await parsedCallback(post);
            }
        }, notBefore);
    } finally {
        signalHandler('SIGQUIT');
    }
})(url);