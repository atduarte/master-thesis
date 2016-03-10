'use strict';
const log = require('npmlog-ts');
const knex = require('knex');

const logPrefix = 'extract/cache';
let db = null;

const change = (uniqid, commit, blobId, data) => {
    return {
        uniqid,
        commitId: commit.id().toString(),
        timestamp: commit.time(),
        blobId,
        data: JSON.stringify(data),
    };
};

module.exports.setup = (databaseName) => {
    // TODO: config
    db = knex({
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            user: 'node',
            password: 'pass',
            database: databaseName,
        },
    });

    const changesTable = db.schema.hasTable('changes')
    .then(exists => {
        if (exists) return;

        return db.schema.createTable('changes', table => {
            table.string('uniqid');
            table.string('commitId', 40);
            table.string('blobId', 40);
            table.bigInteger('timestamp');
            table.json('data');
            table.unique(['commitId', 'blobId']);
        });
    });

    return Promise.all([changesTable]);
};

module.exports.get = db;

module.exports.getChangesData = (commit, parents, blobId) => {
    return db('changes')
    .select('uniqid', 'commitId', 'data')
    .where('blobId', '=', blobId)
    .orderBy('timestamp', 'desc')
    .then(data => {
        while (data.length > 0) {
            if (!parents.some(_ => _ == data[0].commitId) && blobId) {
                data.shift();
                continue;
            }

            return db('changes')
            .select('data')
            .where('uniqid', '=', data[0].uniqid)
            .andWhere('timestamp', '<', commit.time())
            .orderBy('timestamp', 'desc')
            .map(_ => _.data);
        }

        //log.error(logPrefix, 'Miss ' + commit.id().toString().slice(0, 8), blobId); process.exit(-1);
        return undefined;
    });
};

module.exports.saveChanges = (data) => {
    data = data.map(_ => change.apply(null, _));
    return db.batchInsert('changes', data)
    .catch(e => {
        // TODO: What if we replaced?
        log.verbose(logPrefix, 'Failed to save changes for: ', {
            commit: data[0].commitId,
            blob: data[0].blobId,
            filename: JSON.parse(data[0].data).filename,
        });

        if (e.code !== '23505') throw e;
    });
};
