const fs = require('fs');
const path = require('path');

function Helpers(cloudant, resourcePath, visitor) {
  return {
    create() {
      const createDbAndInsertDesignDocs = dbs => Promise.all(dbs
          .map(db => createDb(db).then(() => insertDesignDocsForDb(db))));

      return directories(resourcePath)
        .then(createDbAndInsertDesignDocs)
        .then(() => visitor({ msg: 'Done.' }))
        .catch(e => visitor({ msg: 'Database create failed', error: e }))
        .catch(e => visitor({ msg: `${e.message}`, error: e }));
    },

    destroy() {
      return directories(resourcePath)
        .then(dbDirs => {
          Promise.all(dbDirs.map(destroyDb))
            .then(() => visitor({ msg: 'Done.' }))
            .catch(e => visitor({ msg: 'Database destroy failed', error: e }));
        })
        .catch(e => visitor({ msg: `${e.message}`, error: e }));;
    },
  };
  function createDb(name) {
    return cloudant.db
      .create(name)
      .then(r => visitor({ msg: `Create db ${name}` }))
      .catch(e => {
        if (e.statusCode === 412) visitor({ msg: `Found db ${name}` });
        else visitor({ msg: `Failed to create db ${name}: ${e.reason}`, error: e });
        return e;
      });
  }

  function destroyDb(name) {
    return cloudant.db.destroy(name)
      .then(() => visitor({ msg: `Destroy db ${name}` }))
      .catch(e => {
        visitor({ msg: `Failed to destroy db ${name}: ${e.reason}`, error: e });
        return e;
      });
  }

  function insertDesignDocsForDb(dbName) {
    const designPath = path.join(resourcePath, dbName, '_design');
    const hasDesignDocs = fs.existsSync(designPath);
    if (!hasDesignDocs) return Promise.resolve();

    const farr = files(designPath);
    const payload = {
      docs: farr.map(f => {
        const docPath = path.join(designPath, f);
        const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
        delete doc._rev;
        return doc;
      }),
    };

    return cloudant.db.use(dbName)
      .bulk(payload)
      .then(rs => {
        rs.forEach(r => {
          if (r.ok) {
            visitor({ msg: `Created ${r.id}` })
          } else {
            visitor({ msg: `Skipped ${r.id}: ${r.reason}` })
          }
        });
      })
      .catch(e => {
        visitor({ msg: `  Failed to insert design documents ${e.reason}` })
      });
  }

  function insertDoc(dbName, doc, id) {
    return cloudant.db.use(dbName).insert(doc, id)
      .then(() => visitor({ msg: `Inserted ${id} in db ${dbName}` }))
      .catch(e => visitor({ msg: `Using existing ${id}) document: ${e.reason}`, error: e }));
  }

  function directories(srcpath) {
    return new Promise((resolve, reject) => {
      fs.readdir(srcpath, (err, r) => {
        if (err) {
          reject(err);
        } else {
          resolve(r);
        }
      });
    });
  }

  function files(srcpath) {
    return fs.readdirSync(srcpath)
      .filter(file => !fs.statSync(path.join(srcpath, file)).isDirectory());
  }

  function defaultVisitor(msg) {
    if (msg.error) console.error(msg);
    else console.log(msg);
  }
}

module.exports = Helpers;
