'use strict';
const log = require('npmlog-ts');
const csv = Promise.promisify(require("csv-to-array"));
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');
const barinel = require('../barinel');

// Proof-of-concept ...

const diagnose = (path) => {
    const name = _.head(_.takeRight(path.split('/'), 2));

    return Promise.props({
        results: barinel.getResults(path),
        classNames: barinel.getFaultyClassNames(path),
    })
    .then(data => barinel.getMinPosition(data.results, data.classNames))
    .tap(x => console.log([name].concat(x).join(',')))
        .tap(x => {
            if (x[0] == -1) log.info('', name);
        })
};

module.exports.builder = (yargs) => {
    return yargs
    .usage('Diagnose Barinel results.\n\nUsage: ./$0 diagnose <folder-paths> ')
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

