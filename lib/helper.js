const fs = require('fs');
const path = require('path');

function Helpers(cloudant, resourcePath, visitor) {
  return {
    create() {
      const dbDirs = directories(resourcePath);
      const ps = dbDirs.map(dir => createDb(dir)
        .then(() => insertDesignDocsForDb(dir))
        .catch(e => {
          visitor({ msg: `${e.name} ${e.message}`, error: e });
          return e;
        }));
      return Promise.all(ps)
        .then(() => visitor({ msg: 'Done.' }))
        .catch(e => visitor({ msg: 'Database create failed', error: e }));
    },

    destroy() {
      const dbDirs = directories(resourcePath);
      const ps = dbDirs.map(destroyDb);
      return Promise.all(ps)
        .then(() => visitor({ msg: 'Done.' }))
        .catch(e => visitor({ msg: 'Database destroy failed', error: e }));
    },
  };
  function createDb(name) {
    return cloudant.db.create(name)
      .then(() => visitor({ msg: `Create db ${name}` }))
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
    try {
      return fs.readdirSync(srcpath)
        .filter(file => fs.statSync(path.join(srcpath, file)).isDirectory());
    } catch (e) {
      visitor({ msg: `${e.message}`, error: e });
      throw e;
    }
  }

  function files(srcpath) {
    return fs.readdirSync(srcpath)
      .filter(file => !fs.statSync(path.join(srcpath, file)).isDirectory());
  }

  function defaultVisitor(msg) {
    if (msg.error) console.error(msg);
    else console.log('---', msg);
  }
}

module.exports = Helpers;
