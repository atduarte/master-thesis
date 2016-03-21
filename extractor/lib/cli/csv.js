'use strict';
const prepareCSV = require('../prepareCSV/prepare');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Prepare CSV from JSON data.\n\nUsage: ./$0 csv <name>')
    .demand(2, 2);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-csv';
    log.level = argv.logLevel;

    const projectName = argv._[1];

    return prepareCSV(projectName);
};
