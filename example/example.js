const Generator = require('../index.js');
const path = require('path');

const progressVisitor = msg => console.log(msg); // may be undefined to use default
const url = '<CLOUDANT-URL>';
const resourcePath = path.join(process.cwd(), 'db')

new Generator(url, progressVisitor)
    .resources(resourcePath)
    .create();