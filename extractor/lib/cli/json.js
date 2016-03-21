'use strict';
const prepareJSON = require('../prepareJson/prepare');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Prepare JSON from raw data.\n\nUsage: ./$0 prepare <name>')
    .demand(2, 2);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-json';
    log.level = argv.logLevel;

    const projectName = argv._[1];

    return prepareJSON(projectName);
};
