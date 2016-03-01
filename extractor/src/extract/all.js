"use strict";
import _ from 'lodash';
import Promise from 'bluebird';
import extractFixInfo from './fixInfo';
import extractFileChanges from './fileChanges';
import extractFileSpecs from './fileSpecs';

export default (commit) => {
    let parentCommit = null;

    return Promise.resolve(commit.getParents(1, () => {}))
    .then((parents) => { parentCommit = parents[0]; })

    // Fix Info
    .then(() => { return extractFixInfo(commit) })

    // Components Info
    .then((info) => {
        return Promise.map(Object.keys(info.components), (componentPath) => {
            // File Changes
            let fileChangesPromise = extractFileChanges(commit.owner(), commit, componentPath).then((changes) => {
                info.components[componentPath].changes = changes;
            });

            // File Specs
            let fileSpecsPromise = extractFileSpecs(parentCommit, info.components[componentPath].oldFilename)
            .then((specs) => {
                _.assign(info.components[componentPath], specs);
            });

            return Promise.all([fileChangesPromise, fileSpecsPromise]);
        })
        .then(() => { return info })
    });
};
