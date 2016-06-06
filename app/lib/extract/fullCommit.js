'use strict';
const Git = require('nodegit');
const log = require('npmlog-ts');
const extractBaseInfo = require('./baseInfo');
const extractFileChanges = require('./fileChanges');
const _ = require('lodash');

const logPrefix = 'extract/fullCommit';

module.exports = (projectConfig, commit, i) => {
    log.verbose(logPrefix, `Extracting ${commit.id()}`);

    return extractBaseInfo(projectConfig, commit)
    .then(info => {

        if (i != 0) {
            const changedComponents = _.pickBy(info.components, x => x.linesAdded + x.linesRemoved > 0);

            if (_.size(changedComponents) == 0) return null;

            const cleanComponentNames = _(info.components)
                .pickBy(x => x.linesAdded + x.linesRemoved == 0)
                .keys()
                .shuffle()
                .splice(0, 4 * _.size(changedComponents))
                .value();

            info.components = Object.assign({},
                changedComponents,
                _.pick(info.components, cleanComponentNames)
            );
        }

        // Filter
        return Promise.resolve(Object.keys(info.components))
        .tap(files => log.verbose(logPrefix, `Will extract infos about ${files.length} components`))

        // Extract each
        .each(componentPath => {
            return extractFileChanges(projectConfig, commit, componentPath)
            .tap(changes => { info.components[componentPath].changes = changes; });
        }, {concurrency: 20})

        .then(() => info);
    });
};
