'use strict';
const Git = require('nodegit');

module.exports = (repo) => {
    const walker = Git.Revwalk.create(repo);

    walker.sorting(Git.Revwalk.SORT.TIME);
    walker.pushHead();

    return Promise.resolve(walker.getCommits(Math.pow(10, 9)))
    .then(_ => _[_.length - 1])
    .call('time');
};
