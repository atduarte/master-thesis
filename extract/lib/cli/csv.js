'use strict';
const prepareCSV = require('../prepareCSV/prepare');
const getProjectConfig = require('../util/getProjectConfig');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Prepare CSV from JSON data.\n\nUsage: ./$0 csv <name> <analyze-count>')
    .demand(2, 3);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-csv';
    log.level = argv.logLevel;

    const projectName = argv._[1];
    const projectConfig = getProjectConfig(projectName, argv.projectConfig);
    const analyzeCount = argv._[2] || 10;

    return prepareCSV(projectConfig, projectName, analyzeCount)
    .then(() => process.exit(0));
};
