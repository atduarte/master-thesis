#!/usr/bin/env bash

BASEPWD=${PWD}
START=$1
ESTIMATORS=$2
ARRAY=()

for file in ${START}*/;
do
  if [ ! -f $file/results.csv ] || [ ! -f $file/prediction.n.${ESTIMATORS}.csv ]; then continue; fi
  ARRAY+=($file)
done

./index.js modifier $ESTIMATORS ${ARRAY[*]}

