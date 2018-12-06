#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const Couchinator = require('../lib');
const package = require('../package.json');
const DEFAULT_PATH = 'cloudant-database';

let command;
program.version(package.version);

program.command('create').action(cmd => (command = 'create'));

program.command('destroy').action(cmd => (command = 'destroy'));

program.command('recreate').action(cmd => (command = 'recreate'));

program
  .option('-u --url <url>', 'couchdb url')
  .option('-p --path <path>', 'resource path. Default ./' + DEFAULT_PATH)
  .option('-x --prefix <prefix>', 'db name prefix')
  .option('-b --verbose', 'verbose logs', false)
  .option(
    '-d --ddocsonly',
    'import design docs only. Do no import other docs ',
    false
  );

program.parse(process.argv);

validate();

const rpath = program.path
  ? path.isAbsolute(program.path)
    ? program.path
    : path.join(process.cwd(), program.path)
  : path.join(process.cwd(), DEFAULT_PATH);

main({
  command,
  url: program.url,
  path: rpath,
  prefix: program.prefix,
  allDocs: !program.ddocsonly,
  verbose: program.verbose,
});

function main(opts) {
  const command = opts.command;
  const url = opts.url;
  const prefix = opts.prefix;
  const rpath = opts.path;
  const allDocs = opts.allDocs;

  const visitor = o => {
    const level = opts.verbose ? 0 : 30;
    if (o.level >= level) {
      if (o.error) {
        console.error(o.msg);
      } else {
        console.log(o.msg);
      }
    }
  };
  const couchinator = new Couchinator(url);

  switch (command) {
    case 'create':
      couchinator
        .resources(rpath, true)
        .visitor(visitor, true)
        .prefix(prefix, true)
        .configure()
        .create(allDocs)
        .catch(e => process.exit(2));
      break;
    case 'destroy':
      couchinator
        .resources(rpath, true)
        .visitor(visitor, true)
        .prefix(prefix, true)
        .configure()
        .destroy()
        .catch(e => process.exit(2));
      break;
    case 'recreate':
      couchinator
        .resources(rpath, true)
        .visitor(visitor, true)
        .prefix(prefix, true)
        .configure()
        .recreate(allDocs)
        .catch(e => process.exit(2));
      break;
    default:
      exit('Invalid command.');
  }
}

function validate() {
  if (program.args.length === 0) exit();
  if (!command) exit('Invalid command.');
  if (!program.url) exit('Url required.');
  if (program.args.length === 0) exit();
}

function exit(msg) {
  if (msg) {
    console.error('Error: ' + msg + '\n');
  }
  program.outputHelp();
  process.exit(1);
}
