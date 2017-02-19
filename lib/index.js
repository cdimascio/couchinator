const Cloudant = require('cloudant');
const fs = require('fs');
const path = require('path');
const Commands = require('./commands');

function CouchinatorApi(cloudantConfig, resourcePath, logger) {
  if (!cloudantConfig) throw Error('cloudant config required.');
  if (typeof cloudantConfig === 'string') {
    cloudantConfig = {
      url: cloudantConfig,
      plugin: 'promises'
    }
  }

  const cloudant = Cloudant(cloudantConfig);
  const h = Commands(cloudant, resourcePath, logger);

  return {
    create: h.create,
    destroy: h.destroy
  };
}

module.exports = function (cloudantConfig, visitor) {
  const c = {
    resources(path) {
      if (!path) throw Error('path required');
      return CouchinatorApi(cloudantConfig, path, visitor);
    },
  };
  return c;
};
