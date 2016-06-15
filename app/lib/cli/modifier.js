'use strict';
const log = require('npmlog-ts');
const csv = Promise.promisify(require("csv-to-array"));
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');
const barinel = require('../barinel');

// Proof-of-concept ...

const modifier = (file, path, from) => {
    const name = _.head(_.takeRight(path.split('/'), 2));

    return Promise.props({
        results: barinel.getResults(path),
        predictions: barinel.getPredictions(path, file),
        classNames: barinel.getFaultyClassNames(path),
    })
    .then(data => {
        const results = data.results;
        const predictions = data.predictions;
        const classNames = data.classNames;

        if (!classNames) return 0;

        const newResults = _(results)
            .map(result => Object.assign({}, result, {
                //value: result.value * getBestResultPrediction(classNames, result.name)
                value: result.value * getResultPrediction(predictions, result.name, from)
            }))
            .orderBy('value', 'desc')
            .value();

        if (predictions.length < 50) console.log(name);

        const position = barinel.getMinPosition(results, classNames)[0];
        const newPosition = barinel.getMinPosition(newResults, classNames)[0];
        const diff = position - newPosition;

        //(diff < 0 ? log.warn : (diff == 0 ? log.verbose : log.info))(name, `${position} - ${newPosition} = ${diff}`);

        return diff;
    });
};

const getResultPrediction = (predictions, resultName, from) => {
    const className = resultName.substring(0, resultName.lastIndexOf('/') + 1);

    const results = _.filter(predictions, (prediction) => prediction.name.endsWith(className));

    if (results.length > 1) {
        log.warn('modified', `More than one prediction for ${resultName}`, results);
    } else if (results.length == 0) {
        results.push({value: undefined});
    }

    return transformPredictionValue(results[0].value, from);
};

const getBestResultPrediction = (classNames, resultName) => {
    const resultClassName = resultName.substring(0, resultName.lastIndexOf('/') + 1);

    return classNames.indexOf(resultClassName) != -1 ? 2 : 1;
};

const transformPredictionValue = (value, from) => {
    return value >= from ? 2 : 1;
};

module.exports.builder = (yargs) => {
    return yargs
    .usage('Modify Barinel results.\n\nUsage: ./$0 modify <file> <folder-paths> ')
    .demand(2);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-modifier';
    log.level = argv.logLevel;
    log.timestamp = false;

    const file = argv._[1];
    const from = argv._[2];
    const paths = argv._.slice(3).sort();

    //log.info('info', `File: ${file}`);
    log.info('info', `From: ${from}; Length: ${paths.length}`);

    return Promise.resolve(paths)
    .map(path => modifier(file, path, from))
    .map(diff => diff == 0 ? 0 :diff / Math.abs(diff))
    .tap(result => {
        const stat = _.countBy(result);
        log.info('result', `Affects: ${stat['-1'] + stat['1']} (${stat['-1']} / ${stat['1']} = ${(stat['-1'] / stat['1']).toFixed(3)})`);
    });
};

