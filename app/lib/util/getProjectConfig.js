'use strict';
const log = require('npmlog-ts');

module.exports = (projectName, path) => {
    path = path || `project-config/${projectName}`;
    let config = {};

    try {
        /* eslint global-require: 0 */
        config = require(`../../${path}`);
    } catch (e) {
        log.error('util/getProjectConfig', `Failed to load config - ${path}`);
    }

    return Object.assign(require('../../project-config/default'), config);
};
