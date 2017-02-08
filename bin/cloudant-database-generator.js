 
const program = require('commander');
const path = require('path');
const Generator = require('../lib');

const DEFAULT_PATH = 'cloudant-database';
const required = (val, name) => {
  if (!val) {
    console.error(`${name} required.`);
    process.exit(1);
  }
}
let command;
program
  .version('0.0.1')

program
  .command('create')
  .action(cmd => command = 'create')

program
  .command('destroy')
  .action(cmd => command = 'destroy')

program
  .option('-u --url <url>', 'Cloudant database url')
  .option('-p --path <path>', 'Resource path. Default ./' + DEFAULT_PATH)


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
  path: rpath
});


function main(opts) {
  const command = opts.command
  const url = opts.url;
  const rpath = opts.path;

  const visitor = o => {
    if (o.error) {
      console.error(o.msg);
    } else {
      console.log(o.msg);
    }
  } 
  const generator = new Generator(url, visitor);

  switch(command) {
    case 'create':
      generator.resources(rpath).create();
      break;  
    case 'destroy':
      const c = generator.resources(rpath).destroy()
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
