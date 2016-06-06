'use strict';
const prepareJSON = require('../prepareJson/prepare');
const getProjectConfig = require('../util/getProjectConfig');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Prepare JSON from raw data.\n\nUsage: ./$0 prepare <name> <repo-path>')
    .demand(3, 3);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-json';
    log.level = argv.logLevel;

    const projectName = argv._[1];
    const repoPath = argv._[2];
    const projectConfig = getProjectConfig(projectName, argv.projectConfig);

    return prepareJSON(projectConfig, projectName, repoPath)
    .then(() => process.exit(0));
};
