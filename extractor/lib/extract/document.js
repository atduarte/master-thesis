'use strict';
const fs = Promise.promisifyAll(require('fs'));
const mkdirp = require('mkdirp');

// TODO: config
const getFolderPath = (projectName) => `./out/${projectName}/extract/`;
const getPath = (projectName, commit) => getFolderPath(projectName) + commit.id();

module.exports.setup = (projectName) => mkdirp.sync(getFolderPath(projectName));

module.exports.exists = (projectName, commit) => {
    return fs.statAsync(getPath(projectName, commit)).then(() => true, () => false);
};

module.exports.save = (projectName, commit, info) => {
    return fs.writeFileAsync(getPath(projectName, commit), JSON.stringify(info, null, 4));
};
