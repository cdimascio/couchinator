const Couchinator = require('../lib');
const path = require('path');

// Create a custom progress visitor
const visitor = e => {
  if (e.level >= 30) console.log(e.msg);
};

// Supply the CouchDB or IBM Cloudant URL
const url = '<YOUR-DB-URL>';

// Define the directory that contains our db assets e.g. ./db-resources
const assetPath = path.join(process.cwd(), 'db-resources');

const c = new Couchinator(url)
  .resources(assetPath)
  .visitor(visitor)
  // .prefix('pre_')
  // .suffix('_suf')
  .configure();

c.create();
// c.destroy()
// c.rereate({designDocsOnly: true})
