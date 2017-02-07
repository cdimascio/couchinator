
const fs = require('fs');
const path = require('path');

function dbCreator(cloudant, visitor) {
  this._cloudant = cloudant;

  this.fromDefault = function () {
    const rpath = path.join(__dirname, 'cloudant-database');
    if (!fs.existsSync(rpath)) {
      const msg = `Cannot find database resource path: ${rpath}`;
      this._visitor({msg, error: new Error(msg)});
      return Promise.reject(msg);
    }
    return this.from(rpath);
  }

  this.from = function (rpath) {
    this.rpath = rpath;

    const dbDirs = this._directories(this.rpath);
    const ps = dbDirs.map(dir => {
      return this
        ._createDb(dir)
        .then(() => this._insertDesignDocsForDb(dir))
        .catch(e => {
          this._visitor({msg: `${e.name} ${e.message}`, error: e});
          return e;
        });
    });
    return Promise.all(ps);
  }

  this._createDb = function (name) {
    return this._cloudant.db.create(name)
      .then(() => this._visitor({msg:`Create db ${name}`}))
      .catch(e => {
        if (e.statusCode === 412) this._visitor({msg:`Found db ${name}`});
        // TODO output err object - pass as prop
        else this._visitor({msg:`Failed to create db ${name}: ${e.message}`, error: e});
        return e;
      });
  }

  this._insertDesignDocsForDb = function (dbName) {
    const designPath = path.join(this.rpath, dbName, '_design');
    const hasDesignDocs = fs.existsSync(designPath);
    if (!hasDesignDocs) return Promise.resolve();

    const files = this._files(designPath);
    const payload = {
      docs: files.map(f => {
        const docPath = path.join(designPath, f);
        const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
        delete doc._rev;
        return doc;
      }),
    };
    return this._cloudant.db.use(dbName).bulk(payload).catch(e => console.log(e))
  }

  this._insertDoc = function (dbName, doc, id) {
    return this._cloudant.db.use(dbName).insert(doc, id)
      .then(() => this._visitor({msg: `Inserted ${id} in db ${dbName}`}))
      .catch(e => this._visitor({msg:`Using existing ${id}) document: ${e.reason}`, error: e}));
  }

  this._directories = function (srcpath) {
    return fs.readdirSync(srcpath)
      .filter(file => fs.statSync(path.join(srcpath, file)).isDirectory());
  }

  this._files = function (srcpath) {
    return fs.readdirSync(srcpath)
      .filter(file => !fs.statSync(path.join(srcpath, file)).isDirectory());
  }

  this._visitor = function(msg) {
    if (msg.error) console.error(msg);
    else console.log(msg);
  }
  return this;
}

module.exports = function (cloudant) {
  return dbCreator(cloudant);
};
