const Cloudant = require('@cloudant/cloudant');
const fs = require('fs');
const path = require('path');
const Commands = require('./commands');

function CouchinatorApi({ dbConfig, resourcePath, prefix, suffix, logger }) {
  if (!dbConfig) throw Error('cloudant config required.');
  if (typeof dbConfig === 'string') {
    dbConfig = {
      url: dbConfig,
    };
  }
  // copy the config and add promises dont want to alter the callers
  dbConfig = Object.assign({}, dbConfig, { plugins: 'promises' });

  let cloudant;
  try {
    cloudant = Cloudant(dbConfig);
  } catch (e) {
    console.error(
      'Oh no! The db client threw an error. Did you correctly specify your CouchDB/Cloudant url?'
    );
    process.exit(1);
  }
  const h = Commands(cloudant, resourcePath, prefix, suffix, logger);

  return {
    create: h.create,
    destroy: h.destroy,
    recreate: h.recreate,
  };
}

function Couchinator(dbConfig) {
  const o = {
    dbConfig: dbConfig,
  };
  const c = {
    prefix(prefix, silence) {
      if (!silence && !prefix)
        console.warn('called prefix(...), but no prefix specified.');
      o.prefix = prefix;
      return c;
    },
    suffix(suffix, silence) {
      if (!silence && !suffox)
        console.warn('called suffix(...), but no suffix specified.');
      o.suffix = suffix;
      return c;
    },
    resources(path, silence) {
      if (!silence && !path)
        console.warn('called path(...), but no path specified.');
      o.resourcePath = path;
      return c;
    },
    visitor(visitor, silence) {
      if (!silence && !visitor)
        console.warn('called visitor(...), but no visitor specified.');
      o.logger = visitor;
      return c;
    },
    configure() {
      return CouchinatorApi(o);
    },
  };
  return c;
}

module.exports = Couchinator;
