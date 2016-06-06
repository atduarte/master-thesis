'use strict';
const log = require('npmlog-ts');
const csv = Promise.promisify(require("csv-to-array"));
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');

// Proof-of-concept ...

const min = 0.5;
const div = 1;
const from = 0.5;
const undefinedValue = 0.5;

module.exports.builder = (yargs) => {
    return yargs
    .usage('Modify Barinel results.\n\nUsage: ./$0 modify <estimators> <label> <folder-path> ')
    .demand(2);
};

const modifier = (estimators, label, path) => {
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

        return transformPredictionValue(results[0].value,  _.meanBy(predictions, 'value'));
    };

    const transformPredictionValue = (value, mean) => {
        value = value || mean;
        return Math.max((value / div) + ((1 - (from / div))), min);
        //return value + 0.4;
        //return value;
    };

    const getMinimumPosition = (results, classNames) => {
        //const matchedLines = _(results)
        //    .map((result, index) => _.extend({}, result, {index}))
        //    .filter((result) => _.some(classNames, className => result.name.startsWith(className)))
        //    .value();

        const x = _.reduce(results, (previous, result, index) => {
            if (previous[2] == true) return previous;
            return [
                previous[1] == result.value ? previous[0] : index,
                result.value,
                _.some(classNames, className => result.name.startsWith(className))
            ]

        }, [-1, -1, false]);

        //if (!x[2]) console.log('not found');

        //console.log(x);

        return x[0] + 1; // pos; value; found


        //console.log(matchedLines);
        //
        //
        //
        ////_.each(classNames, (className) => )
        //
        //
        //const first = _.min(_.map(classNames, (className) =>
        //    _.findIndex(results, (result) => result.name.startsWith(className))
        //));
        //
        //return first + 1;
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
        file: path + `/prediction.e${estimators}.${label}.csv`,
        columns: ['name', 'value'],
    })
        .filter(item => !item.name.startsWith('JodaTimeContrib'))
        .map(valueToFloat)
        .map(item => Object.assign(item, {name: item.name.replace('.java', '/')}));

    const classNamesPromise = fs.readFileAsync(`${path}/defects4j.build.properties`, 'utf8')
        .then(data => data.split('\n'))
        .filter(line => line.startsWith('d4j.classes.modified='))
        .then(data => data[0].split('=')[1].split(','))
        .map(className => className.replace(/\./g, '/') + '/')
        .catch(() => undefined);

    return Promise.props({
            results: resultsPromise,
            predictions: predictionsPromise,
            classNames: classNamesPromise,
        })
        .then(data => {
            const results = data.results;
            const predictions = data.predictions;
            const classNames = data.classNames;

            if (!classNames) return 0;

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

            //if (diff != 0) {
            //    console.log(classNames);
            //    console.log(results.splice(0, 15));
            //    console.log(newResults.splice(0, 15));
            //}

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
    const label = argv._[2];
    const paths = argv._.slice(3).sort();

    log.info('info', `Estimators: ${estimators}; Label: ${label};`);
    log.info('info', `Div: ${div}; From: ${from}; Length: ${paths.length}`);

    return Promise.resolve(paths)
        .map(path => modifier(estimators, label, path), {concurrency: 1})
        .map(diff => diff == 0 ? 0 :diff / Math.abs(diff))
        .tap(result => {
            const stat = _.countBy(result);
            //log.info('result', stat);
            log.info('result', `Affects: ${stat['-1'] + stat['1']} (${stat['-1']} / ${stat['1']} = ${(stat['-1'] / stat['1']).toFixed(3)})`);
        });
    //paths.forEach(modifier)
};

