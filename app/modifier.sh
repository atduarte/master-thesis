#!/usr/bin/env bash

BASEPWD=${PWD}
START=../../tests/
FILEP=$1
FROM=$2
ARRAY=()

for file in ${START}*/;
do
  if [ ! -f $file/results.csv ] || [ ! -f $file/$FILEP ]; then continue; fi
  ARRAY+=($file)
done

./index.js modifier $FILEP $FROM ${ARRAY[*]}

