const Cloudant = require('cloudant');
const fs = require('fs');
const path = require('path');
const Helpers = require('./helper');


function DbCreator(cloudantConfig, resourcePath, logger) {
  if (!cloudantConfig) throw Error('cloudant config required.');
  if (typeof cloudantConfig === 'string') {
    cloudantConfig = {
      url: cloudantConfig,
      plugin: 'promises'
    }
  }

  const cloudant = Cloudant(cloudantConfig);
  const h = Helpers(cloudant, resourcePath, logger);

  return {
    create: h.create,
    destroy: h.destroy
  };
}

module.exports = function (cloudantConfig, visitor) {
  const c = {
    resources(path) {
      if (!path) throw Error('path required');
      return DbCreator(cloudantConfig, path, visitor);
    },
  };
  return c;
};
