'use strict';

const twr = (start, end, eventDate) => {
    const tr = 0; // [0,1]
    const t = (eventDate - start) / (end - start); // [0,1]

    return 1 / ( 1 + Math.exp(2 + -12*t + (1-tr)*10) );
};

const getBaseInfo = (data, componentName, component) => {
    const isMostChanged = (percentage) => {
        return [].concat(data.changedComponents)
            .splice(0, Math.ceil(data.changedComponents.length * percentage) + 2)
            .filter(_ => _[0] == componentName)
            .length > 0
    };

    return {
        component: componentName,
        lines: component.lines,
        bytes: component.byteSize,
        added: component.linesAdded > 0 && component.lines == 0,
        changed: (component.linesAdded + component.linesRemoved) > 0 && component.lines > 0,
        mostChanged: data.changedComponents.length > 0 && data.changedComponents[0][0] == componentName,
        'mostChanged25%': isMostChanged(0.25),
        'mostChanged50%': isMostChanged(0.50),
        'mostChanged75%': isMostChanged(0.75),
    }
};

const getAuthorChangeCount = (data, componentName, component) => {
    return component.changes.reduce((previous, current) => {
        const label = 'authorChanges:' + current.author;
        previous[label] = previous[label] + 1 || 1;
        return previous
    }, {});
};

const getAuthorWeightedChangeCount = (data, componentName, component) => {
    return component.changes.reduce((result, current) => {
        const label = 'authorChanges:weighted:' + current.author;
        const value = twr(data.startDate, data.date, current.date);

        result[label] = parseFloat((result[label] + value || value).toFixed(5));
        return result;
    }, {});
};

const getChangeCount = (data, componentName, component) => {
    return { changes: component.changes.length };
};

const getWeightedChangeCount = (data, componentName, component) => {
    return {
        'changes:weighted': parseFloat(component.changes.reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date)
        }, 0).toFixed(6))
    };
};

const addComponentListSortedByChangeCount = (data) => {
     return {
         changedComponents: Object.keys(data.components)
             .filter(_ => data.components[_].lines != 0)
             .filter(_ => data.components[_].linesAdded + data.components[_].linesRemoved > 0)
             .map(_ => [_, data.components[_].linesAdded + data.components[_].linesRemoved])
             .sort((a, b) => a[1] - b[1])
     };
};

// Complement the rawData
const preSteps = [
    addComponentListSortedByChangeCount
];

// Generate the attributes
const attributors = [
    getBaseInfo,
    getChangeCount,
    getWeightedChangeCount,
    getAuthorChangeCount,
    getAuthorWeightedChangeCount
];

module.exports = (data) => {
    data = Object.assign.apply(this, [data].concat(preSteps.map(_ => _(data))));
    return Object.keys(data.components).map(key => {
        return Object.assign.apply(this, attributors.map(_ => _(data, key, data.components[key])));
    });
};
