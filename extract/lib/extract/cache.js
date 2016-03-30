'use strict';
const log = require('npmlog-ts');
const redis = require('redis');

const logPrefix = 'extract/cache';

const client = Promise.promisifyAll(redis.createClient());

const change = (commit, blobId, filename, data) => {
    return {
        commitId: commit.id().toString(),
        timestamp: commit.time(),
        filename,
        blobId,
        data: JSON.stringify(data),
    };
};

module.exports.setup = () => {
    return Promise.resolve(null); // TODO
};

module.exports.getChangeData = (commit, filename) => {
    return client.getAsync([commit.id().toString(), filename].join(':'))
    .then(JSON.parse)
    .catchReturn(null);
};

module.exports.saveChange = (commit, filename, data) => {
    return client.setAsync([commit.id().toString(), filename].join(':'), JSON.stringify(data));
};
