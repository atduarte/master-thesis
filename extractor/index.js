"use strict";
import Git from 'nodegit';
import yargs from 'yargs';
import Promise from 'bluebird';
import identifyFixes from './lib/identifyFixes';
import extractFixInfo from './lib/extractFixInfo';

const repoPath = yargs.argv._[0];

Promise.resolve(Git.Repository.open(repoPath))
    .catch((error) => { console.error(error); })
    .then((repo) => { return repo.getMasterCommit() })
    .then(identifyFixes)
    .map(extractFixInfo)
    .then((info) => {
        console.log(JSON.stringify(info, null, 2))
    });