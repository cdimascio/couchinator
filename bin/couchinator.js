#!/usr/bin/env node
 
const program = require('commander');
const path = require('path');
const Generator = require('../lib');
const package = require('../package.json')
const DEFAULT_PATH = 'cloudant-database';
const required = (val, name) => {
  if (!val) {
    console.error(`${name} required.`);
    process.exit(1);
  }
}
let command;
program
  .version(package.version)

program
  .command('create')
  .action(cmd => command = 'create')

program
  .command('destroy')
  .action(cmd => command = 'destroy')

program
  .command('recreate')
  .action(cmd => command = 'recreate')

program
  .option('-u --url <url>', 'couchdb url')
  .option('-p --path <path>', 'resource path. Default ./' + DEFAULT_PATH)
  .option('-b --verbose', 'verbose logs', false)
  .option('-d --ddocsonly', 'import design docs only. Do no import other docs ', false)


program.parse(process.argv);

validate();

const rpath = program.path 
  ? path.isAbsolute(program.path) 
    ? program.path 
    : path.join(process.cwd(), program.path) 
  : path.join(process.cwd(), DEFAULT_PATH);


console.log
main({
  command,
  url: program.url,
  path: rpath,
  allDocs: !program.designonly,
  verbose: program.verbose
});


function main(opts) {
  const command = opts.command
  const url = opts.url;
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
  } 
  const generator = new Generator(url, visitor);

  switch(command) {
    case 'create':
      generator.resources(rpath).create(allDocs);
      break;  
    case 'destroy':
      generator.resources(rpath).destroy()
      break;
    case 'recreate':
      generator.resources(rpath).recreate(allDocs);
      break;
    default:
      exit('Invalid command.');
  }
}

function validate() {
  if (program.args.length === 0) exit()
  if (!command) exit('Invalid command.');
  if (!program.url) exit('Url required.');
  if (program.args.length === 0) exit();
}

function exit(msg) {
  if (msg) {
    console.error('  Error: '+msg)
  }
  program.help();
  process.exit(1)
}
