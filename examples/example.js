const Couchinator = require('../lib');
const path = require('path');

// Create a custom progress visitor
const progressVisitor = e => {
    if (e.level >= 30) console.log(e.msg);
}

// Define the cloudant url 
// You may use an alternate initialization object (see initialization section)
const url = '<CLOUDANT-URL>';
             
// Define the directory that contains our db assets e.g. ./db-resources
const assetPath = path.join(process.cwd(), 'db-resources')

new Couchinator(url, progressVisitor)
    .resources(assetPath)
    .create(); 
    // or .destroy()
    // or create({designDocsOnly: true})