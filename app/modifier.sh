#!/usr/bin/env bash

BASEPWD=${PWD}
START=$1
ESTIMATORS=$2
LABEL=$3
ARRAY=()

echo "ESTIMATORS=$ESTIMATORS LABEL=$LABEL"

for file in ${START}*/;
do
  if [ ! -f $file/results.csv ] || [ ! -f $file/prediction.e${ESTIMATORS}.${LABEL}.csv ]; then continue; fi
  ARRAY+=($file)
done

./index.js modifier $ESTIMATORS $LABEL ${ARRAY[*]}

