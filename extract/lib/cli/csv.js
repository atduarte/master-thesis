'use strict';
const prepareCSV = require('../prepareCSV/prepare');
const getProjectConfig = require('../util/getProjectConfig');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Prepare CSV from JSON data.\n\nUsage: ./$0 csv <name> <repo-path>')
    .demand(3, 3);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-csv';
    log.level = argv.logLevel;

    const projectName = argv._[1];
    const repoPath = argv._[2];
    const projectConfig = getProjectConfig(projectName, argv.projectConfig);

    return prepareCSV(projectConfig, projectName, repoPath)
    .then(() => process.exit(0));
};
