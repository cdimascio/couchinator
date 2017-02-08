const fs = require('fs');
const path = require('path');

function Helpers(cloudant, resourcePath, visitor) {
  return {
    create() {
      const createDbAndInsertDesignDocs = dbs => Promise.all(dbs
        .map(db => createDb(db).then(() => insertDesignDocsBulk(db))));

      return directories(resourcePath)
        .then(createDbAndInsertDesignDocs)
        .then(() => info('Done.'))
        .catch(e => error('Database create failed', e))
    },

    destroy() {
      const destroyDbs = dbs => Promise.all(dbs.map(destroyDb));
      return directories(resourcePath)
        .then(destroyDbs)
        .then(() => info('Done.'))
        .catch(e => error('Database destroy failed', e));
    },
  };

  function createDb(name) {
    return cloudant.db
      .create(name)
      .then(() => info(`Create db ${name}`))
      .catch(e => error(e.statusCode === 412
        ? error(`Found db ${name}`, e)
        : error(`Failed to create db ${name}: ${e.reason}`, e)));
  }

  function destroyDb(name) {
    return cloudant.db.destroy(name)
      .then(() => info(`Destroy db ${name}`))
      .catch(e => error(`Failed to destroy db ${name}: ${e.reason}`, e));
  }

  function insertDoc(dbName, doc, id) {
    return cloudant.db.use(dbName)
      .insert(doc, id)
      .then(() => info(`Inserted ${id} in db ${dbName}`))
      .catch(e => error(`Using existing ${id}) document: ${e.reason}`, e));
  }

  function insertDesignDocsBulk(dbName) {
    const designPath = path.join(resourcePath, dbName, '_design');
    if (!fs.existsSync(designPath)) return Promise.resolve();

    const createBulkPayload = files => ({
      docs: files.map(f => {
        const docPath = path.join(designPath, f);
        const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
        delete doc._rev;
        return doc;
      }),
    });

    const bulkInsert = payload => cloudant.db.use(dbName)
      .bulk(payload)
      .then(rs => {
        rs.forEach(r => {
          if (r.ok) info(`Created ${r.id}`);
          else info(`Skipped ${r.id}: ${r.reason}`);
        });
      });

    return files(designPath)
      .then(createBulkPayload)
      .then(bulkInsert)
      .catch(e => error(`Failed to insert design documents ${e.reason}`, e));
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
        else resolve(r.filter(file => !fs.statSync(path.join(srcpath, file)).isDirectory()));
      });
    })
  }

  function defaultVisitor(msg) {
    if (msg.error) console.error(msg);
    else console.log(msg);
  }

  function info(msg, r) {
    visitor({ msg })
    return r;
  }
  function error(msg, error) {
    visitor({ msg, error });
    return error;
  }
}

module.exports = Helpers;
