from sklearn import tree
from sklearn.externals.six import StringIO
import graphviz
import re
import math

def preview_tree(clf, class_names, feature_names) :
    dot_data = StringIO()
    tree.export_graphviz(clf, out_file=dot_data, 
                         rotate=True, rounded=True, filled=True,
                         class_names=class_names, feature_names=feature_names) 
    return graphviz.Source(dot_data.getvalue().replace('digraph Tree {', """digraph Tree {
         node [ fontname=Arial, fontsize=8];
    """))

def slicePercentage(data, fromPerc, toPerc) : 
    return data[math.floor(len(data)*fromPerc) : math.floor(len(data)*toPerc)]

def labelIt(data) :
    labels = []
    newData = []
    for i, row in enumerate(data) :
        labels.append(row[0])
        newData.append(row[1:])
    
    return {'data': newData, 'labels': labels}


def deleteColumns(regex, data) :
    indexes = []
    for i, row in enumerate(data[0]) :
        if (re.match(regex, row)) : indexes.append(i)
                
    for rowN, row in enumerate(data) : 
        for columnN in reversed(indexes) :
            del data[rowN][columnN]