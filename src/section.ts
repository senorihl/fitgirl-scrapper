import {Post} from "./types";
import { parse, HTMLElement } from 'node-html-parser';
import chalk from "chalk";

export async function parseConsecutivePage(url: string, onPost: (post: Post) => Promise<void>, notBefore?: Date) {
    console.info(chalk.blue(`Fetching page ${url}`), notBefore ? notBefore.toJSON() : '');
    const res = await fetch(url);
    const content = await res.text();
    const root = parse(content);
    let tooOld = false;


    for (let start of locations('<article', content)) {
        const end = content.indexOf('</article>', start + 1);
        const article = parse(content.substring(start, end + '</article>'.length));
        const m = article.querySelector('h3')?.textContent?.match(/#(\S+)/);
        const id = m && m.length > 0 ? m[1] : null;

        if (null === id) {
            console.log(chalk.grey(`Skipping post due to missing id`))
            continue;
        }

        const lastmod = new Date(article.querySelector('time').getAttribute('datetime'));

        if (notBefore !== null && lastmod !== null && lastmod < notBefore) {
            console.log(chalk.grey(`Skipping post due to lastmod ${lastmod.toJSON()} < ${notBefore.toJSON()}`));
            tooOld = true;
            break;
        }

        const h1 = article.querySelector('h1');

        if (!h1) {
            console.log(chalk.grey(`Skipping post due to missing <h1>`))
            continue;
        }

        const title = h1.textContent.replace(/[\s\t\n\f\r\v]/g, " ").replace(/\s+/g, " ");;
        const url = h1.querySelector('a').getAttribute('href');
        const genres = article.querySelectorAll('p')
            .filter(p => p.textContent.indexOf('Genres/Tags') > -1)
            .map(p => parse(p.innerHTML.split('Genres/Tags')[1]).querySelector('strong').textContent.split(',').map(e => e.trim()))
            .reduce((previousValue, currentValue) => {
                return [...previousValue, ...currentValue];
            }, []);

        await onPost(new Post(id, url, title.trim(), genres, lastmod));
    }

    if (!tooOld && root.querySelector('link[rel="next"]')) {
        await parseConsecutivePage(root.querySelector('link[rel="next"]').getAttribute('href'), onPost, notBefore)
    }
}

function locations(substring,string){
    var a=[],i=-1;
    while((i=string.indexOf(substring,i+1)) >= 0) a.push(i);
    return a;
}