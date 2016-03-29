'use strict';
const prepareCSV = require('../prepareCSV/prepare');
const projectConfig = require('../util/getProjectConfig');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Prepare CSV from JSON data.\n\nUsage: ./$0 csv <name>')
    .demand(2, 2);
};

module.exports.handler = (argv) => {
    const projectName = argv._[1];

    process.title = 'master-thesis-csv';
    log.level = argv.logLevel;

    prepareCSV(projectConfig(argv.projectConfig), projectName);
};
