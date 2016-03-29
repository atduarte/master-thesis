'use strict';
const log = require('npmlog-ts');

module.exports = (path) => {
    let config;

    try {
        /* eslint global-require: 0 */
        config = require(`../../${path}`);
    } catch (e) {
        log.error('util/getProjectConfig', `Failed to load config - ${path}`);
        process.exit();
    }

    return Object.assign(require('../../project-config/default'), config);
};
