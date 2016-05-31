#!/usr/bin/python3

import sys
from helpers import slicePercentage, labelIt, deleteColumns
from sklearn.ensemble import RandomForestClassifier
import csv
import random
import pickle
import numpy as np

data_file = sys.argv[1]
label = '_mostChanged25'

# Load

with open(data_file, 'r') as f:
    reader = csv.reader(f)
    data = list(reader)

# Change Label

label_index = 0

for i, column in enumerate(data[0]) :
    if (column == label) :
        label_index = i
        break

if (label_index == 0) :
    print('Using the __changed label only...')

for i, row in enumerate(data) :
    if i == 0 : continue
    row[0] = row[0][0] + row[label_index][0]

# Remove Columns & Header

deleteColumns('^_mostChanged.*', data)
deleteColumns('^__filename$', data)

data = data[1:]

# To Float

for i, row in enumerate(data) :
    for j, value in enumerate(row[1:]) :
        row[j+1] = float(value)

# Stratify

data_clean = [row for row in data if row[0] == '00']
data_buggy = [row for row in data if row[0] == '11']

random.shuffle(data_clean)
random.shuffle(data_buggy)

# Create Train data + labels

breakpoint = len(data_buggy) * 1 * 1.6 / len(data_clean)
data_clean = slicePercentage(data_clean, 0, breakpoint)
train = labelIt(slicePercentage(data_clean, 0, 0.7) + slicePercentage(data_buggy, 0, 0.7))
# Train

clf = RandomForestClassifier(n_estimators=100, n_jobs=3, class_weight="balanced", criterion='entropy')
clf = clf.fit(train['data'], train['labels'])


# Test

def predictProbs(test_data) :
    test_data = [row[1:] for row in test_data] # Remove label
    predictions_proba = clf.predict_proba(test_data).tolist()
    return [probs[1] for probs in predictions_proba]

predict_buggy = predictProbs(slicePercentage(data_buggy, 0.7, 1))
predict_clean = predictProbs(slicePercentage(data_clean, breakpoint, 1))

print('Buggy (%d): mean = %.2f%%; std = %.2f%%' % (len(predict_buggy), np.mean(predict_buggy)*100, np.std(predict_buggy)*100))
print('Clean (%d): mean = %.2f%%; std = %.2f%%' % (len(predict_clean), np.mean(predict_clean)*100, np.std(predict_clean)*100))
