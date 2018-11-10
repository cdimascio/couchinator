const fs = require('fs');
const path = require('path');
const Report = require('./report');
const fsu = require('../util');

module.exports = function(
  cloudant,
  dbName,
  resourcePath,
  databaseStateMap,
  logger
) {
  const self = this; // TODO logger and report can be refed directly
  const designDocsStateMap = new Map();
  const report = Report(logger, designDocsStateMap, databaseStateMap);

  return {
    updateDocs(allDocs) {
      // TODO change all docs to object
      const ps = [updateDesignDocsBulk()];
      if (allDocs) {
        ps.push(updateDocsBulk());
      }

      return Promise.all(ps)
        .then(rs => {
          const [designDocs = [], docs = []] = rs;
          report.generate(dbName, designDocs, docs);
        })
        .catch(e => logger.error(e.message, e));
    },
  };

  function updateDocsBulk() {
    const docsPath = path.join(resourcePath, dbName);
    if (!fs.existsSync(docsPath)) return Promise.resolve(); // TODO remove sync
    return updateDocsBulkFromDir(docsPath);
  }

  function updateDesignDocsBulk() {
    const docsPath = path.join(resourcePath, dbName, '_design');
    if (!fs.existsSync(docsPath)) return Promise.resolve();
    return updateDocsBulkFromDir(docsPath, true);
  }

  function updateDocsBulkFromDir(docsDir, design) {
    const bulkInsert = payload => cloudant.db.use(dbName).bulk(payload);
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
          if (doc._rev) {
            logger.error(
              `Couchinator removed '_rev' property from ${docPath}. Will still update design doc if necessary.`
            );
            delete doc._rev;
          }
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

    const upsert = payload => {
      const map = new Map();
      payload.docs.forEach(d => map.set(d._id, d));
      const keys = Array.from(map.keys());
      return cloudant.db
        .use(dbName)
        .fetch({ keys })
        .then(r => {
          const p = r.rows.map((e, i) => {
            if (e.error === 'not_found') {
              return payload.docs[i];
            } else {
              // TODO: Fix e.doc is missing if _design json doens't match
              // the _design's name e.g. _design/name
              const newDoc = map.get(e.doc._id);
              const foundDoc = Object.assign(e.doc);
              delete foundDoc._rev;
              if (JSON.stringify(newDoc) === JSON.stringify(foundDoc)) {
                designDocsStateMap.set(newDoc._id, false);
                return newDoc; // Will result in conflict
              } else {
                designDocsStateMap.set(e.doc._id, true);
                const o = Object.assign(newDoc, { _rev: e.value.rev }); // Will update
                return o;
              }
            }
          });
          return { docs: p };
        });
    };

    return fsu
      .files(docsDir)
      .then(createBulkPayload)
      .then(payload => (design ? upsert(payload) : payload))
      .then(r => bulkInsert(r))
      .catch(e => {
        if (e.reason) {
          self.logger.error(
            `Failed to insert documents ${e.reason || e.message}`,
            e
          );
        } else {
          throw e;
        }
      });
  }
};
