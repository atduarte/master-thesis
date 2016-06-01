#!/usr/bin/python3

import sys
from helpers import slicePercentage, labelIt, deleteColumns
from sklearn.ensemble import RandomForestClassifier
import csv
import random
import pickle

data_file = sys.argv[1]
model_file = sys.argv[2]
n = int(float(sys.argv[3]))
label = sys.argv[4]

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
train = labelIt(slicePercentage(data_clean, 0, breakpoint) + data_buggy)

# Train

clf = RandomForestClassifier(n_estimators=n, n_jobs=3, class_weight="balanced", criterion='entropy')
clf = clf.fit(train['data'], train['labels'])

pickle.dump(clf, open(model_file, "wb"))
