const CREATED = '(created)';
const UPDATED = '(updated)';
const UPSERTED = '(upserted)';
const FOUND = '(found)';
const ERROR = '(error)';

module.exports = function Report(logger, dbStateMap) {
  return {
    generate(dbName, designDocs, docs) {
      logger.info(`\n${dbName} ${dbSkipped(dbName) ? FOUND : CREATED}`)
      generateDesignDocReport(dbName, designDocs);
      generateDocReport(dbName, docs);
    }
  };

  function generateDesignDocReport(dbName, docs) {
    if (docs.length < 1) return;
    
    logger.info(`  design docs:`);
    report(docs, r => {
      if (r.ok) {
       logger.info(`    ${UPSERTED} ${r.id}`, r) 
      } else {
       if (r.error === 'conflict') {
         logger.info(`    ${FOUND} ${r.id}`, r);
       } else {
         logger.error(`    ${ERROR} ${r.id}`, r);
         logger.error(`    ${r.reason}`, r);
       }
      }
    })
  }

  function generateDocReport(dbName, docs) {
    if (docs.length < 1) return;

    logger.info(`  docs:`);
    report(docs);
  }

  function report(docs, f) {
    const stats = docs.reduce((acc, r) => {
      if (f) f(r);
      r.ok 
        ? acc.updated += 1
        : acc.skipped += 1;
      return acc;
    }, { 
      updated: 0,
      skipped: 0 
    });

    if (docs.length > 0) {
      logger.info(`    upserted: ${stats.updated}, skipped: ${stats.skipped}`);
    }
  }

  function dbSkipped(name) {
    return !!dbStateMap.get(name);
  }
};
