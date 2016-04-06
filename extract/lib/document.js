'use strict';
const fs = Promise.promisifyAll(require('fs'));
const mkdirp = require('mkdirp');
const walk = require('walk');
const iterateFiles = Promise.promisify(require('iterate-files'));
const _ = require('lodash');

// TODO: config
const getBaseFolderPath = (projectName) => `./out/${projectName}/`;

const getRawFolderPath = (projectName) => getBaseFolderPath(projectName) + 'raw/';
const getRawPath = (projectName, label) => getRawFolderPath(projectName) + label;

const getResultsFolderPath = (projectName) => getBaseFolderPath(projectName) + 'json/';
const getResultsPath = (projectName, label) => getResultsFolderPath(projectName) + label;

module.exports.setup = (projectName) => {
    mkdirp.sync(getRawFolderPath(projectName));
    mkdirp.sync(getResultsFolderPath(projectName));
};

module.exports.raw = {
    getAll: (projectName) => new Promise(resolve => {
        const files = [];
        const walker = walk.walk(getRawFolderPath(projectName));

        walker.on('file', (root, stat, next) => {
            const name = _.last(stat.name.split(':'));
            files.push(name);
            next();
        });

        walker.on('end', () => resolve(files));
    }),
    save: (projectName, id, commit, info) => {
        const label = id + ':' + commit.id().toString();
        return fs.writeFileAsync(getRawPath(projectName, label), JSON.stringify(info, null, 4));
    },
    iterate: (projectName, callback) => iterateFiles(getRawFolderPath(projectName), callback),
};

module.exports.results = {
    save: (projectName, label, info) => {
        return fs.writeFileAsync(getResultsPath(projectName, label), info);
    },
    iterate: (projectName, callback) => iterateFiles(getResultsFolderPath(projectName), callback),
};
