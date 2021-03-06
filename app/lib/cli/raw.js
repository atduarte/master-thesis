'use strict';
const extract = require('../extract/extract');
const getProjectConfig = require('../util/getProjectConfig');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Extract raw data from Git Repo.\n\nUsage: ./$0 extract <name> <repo-path>')
    .demand(3, 3);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-raw';
    log.level = argv.logLevel;

    const projectName = argv._[1];
    const repoPath = argv._[2];
    const projectConfig = getProjectConfig(projectName, argv.projectConfig);

    return extract(projectConfig, projectName, repoPath)
    .then(() => process.exit(0));
};
