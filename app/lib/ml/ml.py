#!/usr/bin/python3

import sys
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier, ExtraTreesClassifier
from sklearn.cross_validation import StratifiedKFold
from sklearn.feature_selection import SelectKBest, f_regression
from unbalanced_dataset.over_sampling import SMOTE
from sklearn.feature_selection import RFECV
from sklearn import decomposition
from sklearn.pipeline import make_pipeline
from sklearn.svm import SVC
import csv
import math
import random
import pickle
import numpy as np

# Arguments

history_file = sys.argv[1]
master_file = sys.argv[2]
label = sys.argv[3]
n_estimators = sys.argv[4]
out_file = sys.argv[5]
out_label = out_file.split('.')[-2]
algorithm = out_file.split('.')[-3]
meta_file = sys.argv[6]

dropped_columns = []

# Helpers

def dropColumns(data) :
    toDrop = []
    if ('raw' not in out_label) : toDrop += [x for x in data.columns.values if x.endswith(':raw')]
    if ('norm' not in out_label) : toDrop += [x for x in data.columns.values if x.endswith(':normalized')]
    if ('author' not in out_label) : toDrop += [x for x in data.columns.values if x.startswith('author')]
    if ('date' not in out_label) : toDrop += ['__date']
    toDrop += [
        '__filename',
        '__changed',
        '_mostChanged',
        '_mostChanged25',
        '_mostChanged50',
        '_mostChanged75',
    ]

    return data.drop(toDrop, 1, errors='ignore')

def predictProbs(clf, test_data) :
    predictions_proba = clf.predict_proba(test_data).tolist()
    return [probs[1] for probs in predictions_proba]

def testMean(clf, data) :
    pred = predictProbs(clf, data.drop('label', 1))
    return np.mean(pred) * 100

def testMeanDiff(clf, data) :
    return testMean(clf, data[data.label == '2']) - testMean(clf, data[data.label == '0'])

def train(train, test) :
    smote = SMOTE(kind='regular', verbose=False)
    train_matrix, train_labels = smote.fit_transform(train.drop('label', 1), train.label)

    if (algorithm == 'random-forest') :
        clf = RandomForestClassifier(n_estimators=5, n_jobs=3, criterion='entropy')
    elif (algorithm == 'adaboost') :
        clf = AdaBoostClassifier()

    # clf = SVC(class_weight="balanced", probability=True, verbose=False)

    clf.fit(train_matrix, train_labels)

    return [testMeanDiff(clf, test), clf.score(test.drop('label', 1), test.label),  clf]

# Get File

history_data = pd.read_csv(history_file)
master_data = pd.read_csv(master_file)

# Add Label

history_data['label'] = history_data['__changed'] + history_data[label]
history_data['label'] = history_data['label'].astype(str)

# Remove Columns

history_data = dropColumns(history_data)
dropped_master_data = dropColumns(master_data)

print(history_data.columns.values)

# Train set cut

clean_history = history_data[history_data.label == '0']
buggy_history = history_data[history_data.label == '2']

buggy_train_data = buggy_history
clean_train_data = clean_history[:min(math.floor(len(buggy_train_data) * 5), len(clean_history))]

train_data = pd.concat([buggy_train_data, clean_train_data])
train_data = train_data.reindex(np.random.permutation(train_data.index))
train_data = train_data.reset_index().drop(['index'], 1)

# Train

skf = StratifiedKFold(train_data.label, n_folds=4, shuffle=True)

models = []
for i in range(0, 10) :
    for train_index, test_index in skf:
        models.append(train(train_data.ix[train_index], train_data.ix[test_index]))

models.sort(key=lambda x: -x[0])
best_models = models[:15]

# Predict using all models

results = []
for best_model in best_models :
    prediction = best_model[2].predict_proba(dropped_master_data).tolist()
    results.append([x[1] for x in prediction])

master_data['result'] = np.mean(results, axis=0)

# Join Predictions

predictions = []
for index, row in master_data.iterrows() :
    predictions.append([row.ix['__filename'], row.ix['result']])

# CSV

with open(out_file, 'w') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerows(predictions)

with open(meta_file, 'w') as file:
    writer = csv.writer(file)
    writer.writerows([['range', 10], ['folds', 4], ['n', 15]])
    writer.writerows([dropped_columns])
    writer.writerows([model[:2] for model in models])
