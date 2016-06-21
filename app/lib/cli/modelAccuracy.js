'use strict';
const log = require('npmlog-ts');
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');
const barinel = require('../barinel');

// Proof-of-concept ...

const diagnose = (path) => {
    const name = _.head(_.takeRight(path.split('/'), 2));

    return barinel.getFaultyClassNames(path)
    .map(fault => '/' + fault.substring(0, fault.length - 1) + '.java')
    .tap(faults => fs.writeFileAsync(`${path}/prediction.best.csv`, faults.map(name => [name, 1].join(',')).join('\n') + '\n', 'utf8'));
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

    return Promise.resolve(paths)
    .map(path => diagnose(path), {concurrency: 15})
};

