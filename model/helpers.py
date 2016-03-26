from sklearn import tree
from sklearn.externals.six import StringIO
import graphviz

def preview_tree(clf, class_names) :
    dot_data = StringIO()
    tree.export_graphviz(clf, out_file=dot_data, 
                         rotate=True, rounded=True, filled=True,
                         class_names=class_names) 
    return graphviz.Source(dot_data.getvalue().replace('digraph Tree {', """digraph Tree {
         node [ fontname=Arial, fontsize=8];
    """))
