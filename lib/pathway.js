var Traverse = require('traverse');

function pathway(obj, path) {
  return typeof obj === 'object' ? Traverse(obj).get(typeof path === 'string' ? path.split('.') : path) : undefined;
}

module.exports = pathway;
