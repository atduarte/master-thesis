'use strict';
const log = require('npmlog-ts');
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');
const barinel = require('../barinel');

// Proof-of-concept ...

const diagnose = (path) => {
    return Promise.props({
        classNames: barinel.getFaultyClassNames(path),
    })
    .tap(x => console.log([name]);
};

module.exports.builder = (yargs) => {
    return yargs
    .usage('Diagnose Barinel results.\n\nUsage: ./$0 best-results <folder-paths> ')
    .demand(1);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-diagnose';
    log.level = argv.logLevel;
    log.timestamp = false;

    const paths = argv._.slice(1).sort();

    log.info('info', `Length: ${paths.length}`);
    console.log('name,pos,value');

    return Promise.resolve(paths)
    .map(path => diagnose(path), {concurrency: 15})
};

