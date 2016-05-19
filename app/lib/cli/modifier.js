'use strict';
const log = require('npmlog-ts');
const csv = Promise.promisify(require("csv-to-array"));
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');

// Proof-of-concept ...

const div = 2;
const from = 0.2;

module.exports.builder = (yargs) => {
    return yargs
    .usage('Modify Barinel results.\n\nUsage: ./$0 modify <folder-path>')
    .demand(2);
};

const modifier = (estimators, path) => {
    const name = _.head(_.takeRight(path.split('/'), 2));

    const valueToFloat = (obj) => Object.assign(obj, {value: parseFloat(obj.value)});

    const getResultPrediction = (predictions, resultName) => {
        const className = resultName.substring(0, resultName.lastIndexOf('/') + 1);

        const results = _.filter(predictions, (prediction) => prediction.name.endsWith(className));

        if (results.length > 1) {
            log.warn('modified', `More than one prediction for ${resultName}`, results);
        } else if (results.length == 0) {
            results.push({value: undefined});
        }

        return transformPredictionValue(results[0].value);
    };

    const transformPredictionValue = (value) => {
        if (value === undefined) return 1;
        return Math.max((value / div) + ((1 - (from / div))), 1);
    };

    const getMinimumPosition = (results, classNames) => {
        return _.min(_.map(classNames, (className) => _.findIndex(results, (result) => result.name.startsWith(className)))) + 1;
    };

    const resultsPromise = csv({
        file: path + '/results.csv',
        columns: ['name', 'value'],
        csvOptions: {
            delimiter: ';'
        },
    })
        .filter(item => item.name.indexOf('Test/') == -1)
        .filter(item => item.value != 'NaN')
        .map(valueToFloat);

    const predictionsPromise = csv({
        file: path + `/prediction.n.${estimators}.csv`,
        columns: ['name', 'value'],
    })
        .filter(item => !item.name.startsWith('JodaTimeContrib'))
        .map(valueToFloat)
        .map(item => Object.assign(item, {name: item.name.replace('.java', '/')}));

    const classNamesPromise = fs.readFileAsync(`${path}/defects4j.build.properties`, 'utf8')
        .then(data => data.split('\n'))
        .filter(line => line.startsWith('d4j.classes.modified='))
        .then(data => data[0].split('=')[1].split(','))
        .map(className => className.replace(/\./g, '/') + '/');

    return Promise.props({
            results: resultsPromise,
            predictions: predictionsPromise,
            classNames: classNamesPromise,
        })
        .then(data => {
            const results = data.results;
            const predictions = data.predictions;
            const classNames = data.classNames;

            const newResults = _(results)
                .map(result => Object.assign({}, result, {
                    value: result.value * getResultPrediction(predictions, result.name)
                }))
                .orderBy('value', 'desc')
                .value();

            const position = getMinimumPosition(results, classNames);
            const newPosition = getMinimumPosition(newResults, classNames);
            const diff = position - newPosition;

            (diff < 0 ? log.warn : (diff == 0 ? log.verbose : log.info))(name, `${position} - ${newPosition} = ${position - newPosition}`);

            return diff;

            //console.log(`Old: ${getMinimumPosition(results, classNames)}`);
            //console.log(`New: ${getMinimumPosition(newResults, classNames)}`);

            //console.log(classNames);
            //console.log(results.splice(0, 5));
            //console.log(newResults.splice(0, 5));
        });
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-modifier';
    log.level = argv.logLevel;
    log.timestamp = false;

    const estimators = argv._[1];
    const paths = argv._.slice(2).sort();

    log.info('info', `Div: ${div}; From: ${from}; Length: ${paths.length}`);

    return Promise.resolve(paths)
        .map(path => modifier(estimators, path), {concurrency: 1})
        .map(diff => diff == 0 ? 0 :diff / Math.abs(diff))
        .tap(result => {
            const stat = _.countBy(result);
            //log.info('result', stat);
            log.info('result', `Affects: ${stat['-1'] + stat['1']} (` + (stat['-1'] / stat['1']).toFixed(3) + ' / 1)');
        });
    //paths.forEach(modifier)
};

