var traverse = require('traverse');

function merge(dest, src, isCheckOverwrite) {
  var acc = traverse(dest);
  traverse(src).forEach(function (val) {
    var accVal = acc.get(this.path);
    if (this.isLeaf) {
      if (isCheckOverwrite && accVal !== undefined) {
        throw new Error('Path ' + this.path.join('.') + ' already has value: ' + accVal);
      }
      acc.set(this.path, val);
    } else if (Array.isArray(accVal)) {
      accVal.splice(0, accVal.length);
    }
  });

  return acc.value;
}

module.exports = merge;
