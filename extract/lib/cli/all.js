'use strict';
const extract = require('../extract/extract');
const prepareJSON = require('../prepareJson/prepare');
const prepareCSV = require('../prepareCSV/prepare');
const log = require('npmlog-ts');
const getProjectConfig = require('../util/getProjectConfig');

module.exports.builder = (yargs) => {
    return yargs
        .usage('Do it all.\n\nUsage: ./$0 csv <name> <repo-path> <analyze-count>')
        .demand(3, 4);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis';
    log.level = argv.logLevel;

    const projectName = argv._[1];
    const repoPath = argv._[2];
    const analyzeCount = argv._[2] || 10;
    const projectConfig = getProjectConfig(projectName, argv.projectConfig);

    return extract(projectConfig, projectName, repoPath)
    .then(() => prepareJSON(projectConfig, projectName))
    .then(() => prepareCSV(projectConfig, projectName, analyzeCount))
    .then(() => process.exit(0));
};

