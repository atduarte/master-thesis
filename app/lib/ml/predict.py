#!/usr/bin/python3

import sys
from helpers import deleteColumns
import csv
import pickle

model_file = sys.argv[1]
data_file = sys.argv[2]
out_file = sys.argv[3]

# Load

clf = pickle.load(open(model_file, "rb"))

with open(data_file, 'r') as f:
    reader = csv.reader(f)
    data = list(reader)
    
# Get Filenames

filenames = [row[1] for row in data[1:]]
    
# Remove Columns
        
deleteColumns('^__filename$', data)
deleteColumns('^__changed$', data)
deleteColumns('^_mostChanged.*', data)

data = data[1:]

# To Float

for i, row in enumerate(data) :
    for j, value in enumerate(row) :        
        row[j] = float(value)
        

# Predict

predictions = clf.predict_proba(data).tolist()

for i, prediction in enumerate(predictions) :
    predictions[i] = [filenames[i], predictions[i][1]]
    
# CSV 

with open(out_file, 'w') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerows(predictions)