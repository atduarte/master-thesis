"use strict";
const Promise = require('bluebird');
const extractBaseInfo = require('./baseInfo');
const extractFileChanges = require('./fileChanges');
const extractFileSpecs = require('./fileSpecs');

module.exports = (commit) => {
    let parentCommit = null;

    return Promise.resolve(commit.getParents(1, () => {}))
    .then(parents => { parentCommit = parents[0]; })

    // Fix Info
    .then(() => extractBaseInfo(commit))

    // Components Info
    .then(info => {
        return Promise.map(Object.keys(info.components), componentPath => {
            // File Changes
            let fileChangesPromise = extractFileChanges(commit.owner(), commit, componentPath)
            .then(changes => {
                info.components[componentPath].changes = changes;
            });

            // File Specs
            let fileSpecsPromise = extractFileSpecs(parentCommit, info.components[componentPath].oldFilename || componentPath)
            .then(specs => {
                Object.assign(info.components[componentPath], specs);
            });

            return Promise.all([fileChangesPromise, fileSpecsPromise]);
        })
        .then(() => info)
    });
};
