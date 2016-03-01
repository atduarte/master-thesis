"use strict";
import fs from 'filendir';
import Git from 'nodegit';
import yargs from 'yargs';
import Promise from 'bluebird';
import Queue from 'bluebird-queue';
import identifyFixes from './identifyFixes';
import extract from './extract';

const repoPath = yargs.argv._[0];
const outPath = yargs.argv._[1];

function reportMemory() {
    var heap = process.memoryUsage().heapUsed / (1024 * 1024);
    console.log(heap.toFixed(2) + 'mb');
}

console.time('Complete execution');

Promise.resolve(Git.Repository.open(repoPath))
.catch((error) => { console.error(error); })
.tap(() => { console.log('Repo open'); })

.then((repo) => { return repo.getMasterCommit() })
.tap((commit) => { console.log('Base Commit: ' + commit.id()); })

// Identify

.then(identifyFixes)
.tap((fixes) => { console.log(fixes.length + ' fix commits identified'); })

// Extract

.map((commit) => {
    let label = commit.id().toString();
    console.time(label);

    return extract(commit)
        .then((info) => {
            delete info.commit;
            fs.writeFile(outPath + '/' + label, JSON.stringify(info, null, 4), () => {}); // Why wait for it?
        })
        .tap(() => { console.timeEnd(label) })
        .tap(reportMemory);
}, {concurrency: 1})

// Report

.tap(() => {
    console.timeEnd('Complete execution');
});
