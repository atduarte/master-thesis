#!/usr/bin/env bash

BASEPWD=${PWD}
START=../../tests/
ARRAY=()

for file in ${START}*/;
do
  if [ ! -f $file/results.csv ] || [ ! -f $file/defects4j.build.properties ]; then continue; fi
  ARRAY+=($file)
done

./index.js diagnose ${ARRAY[*]}

