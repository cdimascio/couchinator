const path = require('path');
const Logger = require('../logger');
const DocUpdater = require('./updater');
const fsu = require('../util');

function Commands(cloudant, resourcePath, visitor) {
  const logger = Logger(visitor);
  const databaseStateMap = new Map();

  return {
    create(opts = { designDocsOnly: false }) {
      const allDocs = !opts.designDocsOnly;
      const createDbsAndUpdateDocs = dbs =>
        Promise.all(
          dbs.map(db =>
            createDb(db).then(() =>
              DocUpdater(
                cloudant,
                db,
                resourcePath,
                databaseStateMap,
                logger
              ).updateDocs(allDocs)
            )
          )
        );

      return fsu
        .directories(resourcePath)
        .then(createDbsAndUpdateDocs)
        .then(() => logger.info('Done.'))
        .catch(e => {
          const m = `Database create failed: ${e.message || e.reason}`;
          logger.error(m, e);
          throw Error(m);
        });
    },

    destroy() {
      const destroyDbs = dbs => Promise.all(dbs.map(destroyDb));
      return fsu
        .directories(resourcePath)
        .then(destroyDbs)
        .then(() => logger.info('Done.'))
        .catch(e => {
          const m = `Database destroy failed: ${e.message || e.reason}`;
          logger.error(m, e);
          throw Error(m);
        });
    },

    recreate(opts = { designDocsOnly: false }) {
      // TODO HANDLE DESTROY FAIL
      return this.destroy().catch(e => {}).then(r => this.create(opts));
    },
  };

  function createDb(name) {
    return cloudant.db
      .create(name)
      .then(() => logger.debug(`Create db ${name}`))
      .catch(e => {
        if (e.statusCode === 412) {
          databaseStateMap.set(name, true);
          logger.debug(`Found db ${name}`);
        } else {
          logger.error(
            `Failed to create db ${name}: ${e.message || e.reason}`,
            e
          );
        }
      });
  }

  function destroyDb(name) {
    return cloudant.db
      .destroy(name)
      .then(() => logger.info(`Destroy db ${name}`))
      .catch(e =>
        logger.error(
          `Failed to destroy db ${name}: ${e.message || e.reason}`,
          e
        )
      );
  }
}

module.exports = Commands;
