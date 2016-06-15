'use strict';
const _ = require('lodash');
const csv = Promise.promisify(require("csv-to-array"));
const fs = Promise.promisifyAll(require('fs'));

const _valueToFloat = (obj) => Object.assign(obj, {value: parseFloat(obj.value)});

const getMinPosition = (results, classNames) => {
    const x = _.reduce(results, (previous, result, index) => {
        if (previous[2] == true) return previous;
        return [
            previous[1] == result.value ? previous[0] : index, // It's ordered
            result.value,
            _.some(classNames, className => result.name.startsWith(className))
        ];
    }, [-1, -1, false]); // [index, value, found]

    return [x[0] + 1, x[1]];
};

const getResults = (path) => {
    return csv({
        file: path + '/results.csv',
        columns: ['name', 'value'],
        csvOptions: {
            delimiter: ';'
        },
    })
    .filter(item => item.name.indexOf('Test/') == -1)
    .map(item => Object.assign({}, item, {value: item.value != 'NaN' ? item.value : 0}))
    .map(_valueToFloat);
};

const getPredictions = (path, file) => {
    return csv({
        file: path + '/' + file,
        columns: ['name', 'value'],
    })
    .filter(item => !item.name.startsWith('JodaTimeContrib'))
    .map(_valueToFloat)
    .map(item => Object.assign(item, {name: item.name.replace('.java', '/')}));
};

const getFaultyClassNames = (path) => {
    return fs.readFileAsync(`${path}/defects4j.build.properties`, 'utf8')
    .then(data => data.split('\n'))
    .filter(line => line.startsWith('d4j.classes.modified='))
    .then(data => data[0].split('=')[1].split(','))
    .map(className => className.replace(/\./g, '/') + '/')
    .catch(() => undefined);
};

module.exports = {
    getMinPosition,
    getResults,
    getPredictions,
    getFaultyClassNames
};
