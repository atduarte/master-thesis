'use strict';
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    // ...
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis';
    log.level = argv.logLevel;

    // ...
};
