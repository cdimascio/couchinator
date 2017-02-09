#cloudant-database-generator

Generate (or destroy) cloudant databases using a simple on disk file structure.

cloudant-database-generator provides both a module and a cli, thus enabling you to use the generator directly within your app or from the command line.


## Install

`npm install cloudant-database-generator`

Global installation is convenient when using the **CLI**

`npm install cloudant-database-generator -g`

## Usage

### CLI

- create dbs
```cloudant-database-generator.js create --url <YOUR-CLOUDANT-URL> --path <RESOURCE_PATH>```

- destroy dbs
```cloudant-database-generator.js destroy --url <YOUR-CLOUDANT-URL> --path <RESOURCE_PATH>```

**Note:** `RESOURCE_PATH` may be absolute or relative to the current working directy

### Module

```javascript
const Generator = require('../lib');
const path = require('path');

// Create a custom progress visitor
const progressVisitor = e => {
    if (e.level >= 30) console.log(e.msg);
}

// Define the cloudant url 
// You may use an alternate initialization object (see initialization section)
const url = '<CLOUDANT-URL>';

// Define the directory that contains our db assets e.g. ./db-resources
const assetPath = path.join(process.cwd(), 'db-resources')

new Generator(url, progressVisitor)
    .resources(assetPath)
    .create(); // pass false to ignore all docs, but design docs
```

## Data Layout

How it works...

In in the resource directory (`RESOURCE_PATH`), create a folder for each cloudant db. Each folder's name should be the name of a database to create.

Within each db folder, create a `_design` folder. The `_design` folder should contain a list of json files containing each design document.

Also, within each db folder, create a json document to host any documents to add at generation time. This should follow the bulk document format.

**See examples/db-resources to review a sample layout**

To try it, you can run the example:

- clone this repo
- `cd examples`
- edit exmaples.js and set `<CLOUDANT-URL>` to your cloudant url
- `node example`
- once complete, the on disk structure will be live in your cloudant database

### Sample layout

See examples/db-resources for a complete exmaple

```
resource-folder
  database-1
    _design
    	designdoc1-1.json
    	designdoc1-2.json
	bulkdocs1-1.json
	bulkdocs1-2.json
  database-2
    _design
    	designdoc2-1.json
    	designdoc2-2.json
	bulkdocs2-1.json
  ...
```

You may use any name for files and folders. Two things to note:

1. the name of the database folder becomes the name is the database
2. the `_design` is a system name and is used to store design docs
   - If you choose you can add design docs using the bulk format. However, it is not recommended. Design documents are immportant and thus should be managed and versioned independently.

Note that both the `_design` folder and the all `*.json` documents are optional. If your db does not require docs to be created at generation time, you don't need to represented them on disk.

For example, below we represent a db with `database-1` which is empty and db with name `database-2` which contains a single design doc.

```
resource-folder
  database-1
  database-2
    _design
    	designdoc1.json
  ...
```

### Design doc representation
Its a standard cloudant design doc. 
e.g. `designdoc1-1.json` above


```json
{
  "_id": "_design/districts",
  "views": {
    "byId": {
      "map": "function (doc) {  if (doc.type === 'district') emit(doc._id, doc);}"
    }
  },
  "language": "javascript"
}
```

### Doc representation
It's a standard bulk doc e.g. `bulkdocs1-1.json` above

```json
{
  "docs": [{
  		"name": "Sammy",
  		"type": "person"
  	}, {
  		"name": "June",
  		"type": "person"
  	}
  ]
}

```


## Module Initialization

var cloudant = Cloudant({account:me, password:password});
If you would prefer, you can also initialize Cloudant with a URL:

#### Cloudant Url
```javascript
const url = "https://MYUSERNAME:MYPASSWORD@MYACCOUNT.cloudant.com"
new Generator(url)
```

#### Bluemix
Running on Bluemix? You can initialize Cloudant directly from the VCAP_SERVICES environment variable:

```javascript
new Generator({
  instanceName: 'foo',
  vcapServices: JSON.parse(process.env.VCAP_SERVICES)
});
```

#### Account
```javascript
const url = "https://MYUSERNAME:MYPASSWORD@MYACCOUNT.cloudant.com"
new Generator({account:me, password:password})
```

## CLI Usage

Currently, the CLI only support a Cloudant URL.

```shell
> cloudant-database-generator
  Usage: cloudant-database-generator [command] [options]


  Commands:

    create  
    destroy 

  Options:

    -h, --help        output usage information
    -V, --version     output the version number
    -u --url <url>    Cloudant database url
    -p --path <path>  Resource path. Default ./cloudant-database
    -b --verbose      Verbose logs
    -d --designonly   Import design docs only. Do no import other docs 
```    

## License
[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)