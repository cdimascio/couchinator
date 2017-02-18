const fs = require('fs');
const path = require('path');

const CREATED = '(created)';
const UPDATED = '(updated)';
const FOUND = '(found)';

const designDocsStateMap = new Map();

function Helpers(cloudant, resourcePath, visitor) {
  return {
    create(allDocs = true) {
      const createDbAndInsertDesignDocs = dbs => Promise.all(
        dbs.map(db => createDb(db).then(data => updateDocs(db, allDocs, data))));

      return directories(resourcePath)
        .then(createDbAndInsertDesignDocs)
        .then(() => info('Done.'))
        .catch(e => error(`Database create failed: ${e.message || e.reason}`, e))
    },

    destroy() {
      const destroyDbs = dbs => Promise.all(dbs.map(destroyDb));
      return directories(resourcePath)
        .then(destroyDbs)
        .then(() => info('Done.'))
        .catch(e => error(`Database destroy failed: ${e.message || e.reason}`, e));
    },
  };

  function createDb(name) {
    return cloudant.db
      .create(name)
      .then(() => debug(`Create db ${name}`, { skipped: false }))
      .catch(e => e.statusCode === 412
        ? debug(`Found db ${name}`, { skipped: true })
        : error(`Failed to create db ${name}: ${e.reason}`, e));
  }

  function destroyDb(name) {
    return cloudant.db.destroy(name)
      .then(() => info(`Destroy db ${name}`))
      .catch(e => error(`Failed to destroy db ${name}: ${e.reason}`, e));
  }

  function updateDocs(dbName, allDocs, data) {
    const ps = [updateDesignDocsBulk(dbName)]
    if (allDocs) ps.push(updateDocsBulk(dbName));

    return Promise.all(ps)
      .then(rs => {
        const desigDocs = rs[0];
        const docs = rs.length === 1 ? [] : rs[1];

        const report = (docs, design) => {
          const stats = docs.reduce((acc, r) => {
            if (design) {
              if (r.ok) {
                const updated = designDocsStateMap.get(r.id);
                info(`    ${updated ? UPDATED : CREATED} ${r.id}`, r);
              } else {
                info(`    ${FOUND} ${r.id}`, r);
              }
            }

            if (r.ok) acc.updated += 1;
            else acc.skipped += 1;

            return acc;
          }, { updated: 0, skipped: 0 });

          if (docs.length > 0) {
            info(`    updated: ${stats.updated}, skipped: ${stats.skipped}`);
          }
        };

        info(`\n${dbName} ${data.skipped ? FOUND : CREATED}`)

        info(`  design docs:`);
        report(desigDocs, true);

        if (docs.length > 0) {
          info(`  docs:`);
          report(docs)
        }
      })
      .catch(e => error(e.message, e))
  }

  function updateDocsBulk(dbName) {
    const docsPath = path.join(resourcePath, dbName);
    if (!fs.existsSync(docsPath)) return Promise.resolve();
    return updateDocsBulkFromDir(dbName, docsPath);
  }

  function updateDesignDocsBulk(dbName) {
    const docsPath = path.join(resourcePath, dbName, '_design');
    if (!fs.existsSync(docsPath)) return Promise.resolve();
    return updateDocsBulkFromDir(dbName, docsPath, true);
  }

  function updateDocsBulkFromDir(dbName, docsDir, design) {
    const bulkInsert = payload => cloudant.db.use(dbName).bulk(payload)
    const createBulkPayload = files => {
      const docs = files.reduce((acc, f) => {
        const docPath = path.join(docsDir, f);
        // TODO asynchronously
        let doc;
        try {
          doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
        } catch (e) {
          throw new SyntaxError(`Failed to parse '${docPath}: ${e.message}`);
        }
        // TODO remove design doc _rev and print warning
        // if list of docs, push all
        if (doc.docs) acc.push(...doc.docs);
        // if a single doc (e.g. design doc), push one
        else acc.push(doc);
        return acc;
      }, []);
      return { docs };
    };

    const upsert = payload => {
      const map = new Map();
      payload.docs.forEach(d => map.set(d._id, d));
      const keys = Array.from(map.keys());
      return cloudant.db.use(dbName)
        .fetch({ keys })
        .then(r => {
          const p = r.rows.map((e, i) => {
            if (e.error === 'not_found') {
              return payload.docs[i]
            } else {
              const newDoc = map.get(e.doc._id);
              const foundDoc = Object.assign(e.doc);
              delete foundDoc._rev;
              if (JSON.stringify(newDoc) === JSON.stringify(foundDoc)) {
                designDocsStateMap.set(newDoc._id, false);
                return newDoc // Will result in conflict
              } else {
                designDocsStateMap.set(e.doc._id, true);
                const o = Object.assign(newDoc, { _rev: e.value.rev }); // Will update
                return o;
              }
            }
          });
          return { docs: p };
        });
    }

    return files(docsDir)
      .then(createBulkPayload)
      .then(payload => design ? upsert(payload) : payload)
      .then(r => bulkInsert(r))
      .catch(e => {
        if (e.reason) {
          error(`Failed to insert documents ${e.reason || e.message}`, e);
        } else {
          throw e;
        }
      });
  }

  function directories(srcpath) {
    return new Promise((resolve, reject) => {
      fs.readdir(srcpath, (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });
  }

  function files(srcpath) {
    return new Promise((resolve, reject) => {
      fs.readdir(srcpath, (err, r) => {
        if (err) reject(err)
        else resolve(r.filter(file => (!fs.statSync(path.join(srcpath, file)).isDirectory() && file.endsWith(".json")))) ;
      });
    })
  }

  function defaultVisitor(msg) {
    if (msg.error) console.error(msg);
    else console.log(msg);
  }

  function debug(msg, data, r) {
    r = r || data;
    visitor({ msg, data, level: 20 })
    return r;
  }

  function info(msg, data, r) {
    r = r || data;
    visitor({ msg, data, level: 30 })
    return r;
  }
  function error(msg, error) {
    visitor({ msg, error, level: 50 });
    return error;
  }
}

module.exports = Helpers;
