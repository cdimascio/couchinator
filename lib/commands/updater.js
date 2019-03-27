const fs = require('fs');
const path = require('path');
const Report = require('./report');
const fsu = require('../util');

module.exports = function(
  cloudant,
  dbName,
  dbDirName,
  resourcePath,
  databaseStateMap,
  logger
) {
  const self = this; // TODO logger and report can be refed directly
  const report = Report(logger, databaseStateMap);

  return {
    updateDocs(allDocs, upsert) {
      const ps = [updateDesignDocsBulk(upsert)];
      if (allDocs) {
        ps.push(updateDocsBulk(upsert));
      }

      return Promise.all(ps)
        .then(rs => {
          const [designDocs = [], docs = []] = rs;
          report.generate(dbName, designDocs, docs);
        })
        .catch(e => logger.error(e.message, e));
    },
  };

  function updateDocsBulk(upsert) {
    const docsPath = path.join(resourcePath, dbDirName);
    if (!fs.existsSync(docsPath)) return Promise.resolve(); // TODO remove sync
    return updateDocsBulkFromDir(docsPath, false, upsert);
  }

  function updateDesignDocsBulk(upsert) {
    const docsPath = path.join(resourcePath, dbDirName, '_design');
    if (!fs.existsSync(docsPath)) return Promise.resolve();
    return updateDocsBulkFromDir(docsPath, true, upsert);
  }

  function bulkGetRecordsIdToRevMap(dbName, payload) {
    const keys = payload.docs.map(d => d._id);

    return cloudant.db
      .use(dbName)
      .fetchRevs({ keys })
      .then(res => {
        return res.rows.reduce((acc, r) => {
          if (r.value) {
            acc[r.id] = r.value.rev;
          }
          return acc;
        }, {});
      });
  }

  function mergeRevIntoRecords(idToRevMap, payload) {
    payload.docs.forEach(p => {
      const rev = idToRevMap[p._id];
      p._rev = rev;
      return p;
    });
    return payload;
  }

  function updateDocsBulkFromDir(docsDir, design, upsert) {
    const createBulkPayload = files => {
      const docs = files.reduce((acc, f) => {
        const docPath = path.join(docsDir, f);
        // TODO asynchronously
        let doc;
        try {
          doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
        } catch (e) {
          logger.error(
            `Failed to parse (skipping) '${docPath}: ${e.message}`,
            e
          );
          return acc;
        }
        if (design) {
          acc.push(doc);
        } else {
          if (doc.docs) {
            acc.push(...doc.docs);
          } else {
            logger.error(
              `Malformed 'docs' property required (skipping) '${docPath}: Use bulk document format.`
            );
          }
        }

        return acc;
      }, []);
      return { docs };
    };

    const bulkInsert = payload => cloudant.db.use(dbName).bulk(payload);
    const mergePayloadWithRevs = payload => {
      if (upsert) {
        return bulkGetRecordsIdToRevMap(dbName, payload).then(r => {
          return mergeRevIntoRecords(r, payload);
        });
      } else {
        return payload;
      }
    };

    return fsu
      .files(docsDir)
      .then(createBulkPayload)
      .then(mergePayloadWithRevs)
      .then(bulkInsert)
      .catch(e => {
        if (e.reason) {
          logger.error(
            `Failed to insert documents ${e.message || e.reason}`,
            e
          );
        } else {
          throw e;
        }
      });
  }
};
