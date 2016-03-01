"use strict";
import Promise from 'bluebird';
import extractFixInfo from './extractFixInfo';
import extractFileChanges from './extractFileChanges';

export default (commit) => {
    return extractFixInfo(commit)

    // TODO: Extract infos about the components from the commit before the fix

    // File Changes
    .then((info) => {
        return Promise.map(Object.keys(info.components), (componentPath) => {
            return extractFileChanges(info.commit.owner(), info.commit, componentPath)
                .then((changes) => {
                    info.components[componentPath].changes = changes;
                });
        }, {concurrency: 25})
        .then(() => { return info });
    });
};
