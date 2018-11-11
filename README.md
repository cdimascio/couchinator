# couchinator

![](https://img.shields.io/badge/status-stable-green.svg) ![](https://img.shields.io/badge/license-MIT-blue.svg)

Fixtures for CouchDB and IBM Cloudant.

Setup ad teardown cloudant databases with ease. **couchinator** is a great tool for unit testing and more. couchinator is both a library and a command line utility.
<p align="center">
	<img src="https://github.com/cdimascio/couchinator/raw/master/assets/couchinator.png" width="650"/>
</p>

You represent your database(s), couchinator takes care of the rest.

See the [Data Layout](#data-layout) section for information on how to represent your database with couchinator.



## Install

```shell
npm install couchinator
```

Global installation is convenient when using the **CLI**

```
npm install couchinator -g
```

## Use the CLI

#### Create

```shell
couchinator create --url <YOUR-CLOUDANT-URL> --path <RESOURCE_PATH>
```

#### Destroy

```shell
couchinator destroy --url <YOUR-CLOUDANT-URL> --path <RESOURCE_PATH>
```

#### Recreate

```shell
couchinator recreate --url <YOUR-CLOUDANT-URL> --path <RESOURCE_PATH>
```

**Note:** `RESOURCE_PATH` may be absolute path or a path relative to the current working directy

## Use the Library

#### Basic Usage

CouchDB
```javascript
const Couchinator = require('couchinator');
new Couchinator('http://127.0.0.1:5984').resources('./db-resources').create(); // or destroy()
```


#### Advanced Usage

```javascript
const Generator = require('couchinator');
const path = require('path');

// Create a custom progress visitor
const progressVisitor = e => {
  if (e.level >= 30) console.log(e.msg);
};

// Define the cloudant url
// You may use an alternate initialization object (see initialization section)
const url = '<CLOUDANT-URL>';

// Define the directory that contains our db assets e.g. ./db-resources
const assetPath = path.join(process.cwd(), 'db-resources');

new Generator(url, progressVisitor).resources(assetPath).create(); // or destroy
```

## Behaviors

Currently, there are two commands:

- **`couchinator create`**

  Creates all databases, design documents, and executes any bulk documents represented in the [data layout](#data-layout). If a design document exists, the design document is updated to reflect the version currently represented in the [data layout](#data-layout).

  Using the `--ddocsonly` flag skips any bulk documents. This flag is particulary useful when you simply want to add/update design documents.

- **`couchinator destroy`**

  destroys all databases represented in the [data layout](#data-layout).

- **`couchinator rcreate`**
  Calls destroy followed by create.

See [CLI Usage](#cli-usage) section for additional arguments.

## Data Layout


### Getting Started

Represent your database(s) on the file system, then **couchinator** uses this representation to create, update, and destroy your database(s) on demand.

```
  shools
    _design
    	students.json
		teachers.json
	students-docs.json
	teachers-docs.json
	users
    _design
    	classrooms.json
	classrooms-docs.json
```


### The Details

1. Create a folder (`RESOURCE_PATH`) to contain your database representation.
2. Within this folder, create a folder for each database. We will refer to each of these as a `db_folder`

   Each `db_folder` name is used as the database name.

3. Within each `db_folder`, _optionally_ create a `_design` folder.

   Within each `_design` folder, create zero or more `.json` files. Each `.json` file _must_ contain a _single_ [design document](http://docs.couchdb.org/en/2.0.0/json-structure.html#design-document).

   For example, `users/_design/students.json`

   ```
   {
     "_id": "_design/students",
     "views": {
       "byId": {
         "map": "function (doc) {  if (doc.type === 'student') emit(doc._id, doc);}"
       }
     },
     "language": "javascript"
   }
   ```

4. Within each `db_folder`, _optionally_ create zero or more `.json` files. Each `.json` file should contain the documents to be added at creation time. They must be specified using CouchDB [bulk document](http://docs.couchdb.org/en/2.0.0/json-structure.html#bulk-documents) format.

   For example, `users/students-docs.json

   ```
   {
     "docs": [
       {
         "_id": "sam895454857",
         "name": "Sam C.",
         "type": "student"
       },
       {
         "_id": "josie895454856",
         "name": "Josie D.",
         "type": "student"
       }
     ]
   }
   ```

   **Note** that Documents may reside in a single `.json file` or may span multiple `.json` files for readability. **couchinator** aggregrates documents spanning multiple files into a single bulk request.

## Example

See examples/db-resources.

To run the the example:

- clone this repo
- `cd examples`
- edit examples.js and set `<CLOUDANT-URL>` to your cloudant url
- Run `node example`
- Your database should now contain documents

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
  "docs": [
    {
      "name": "Sammy",
      "type": "person"
    },
    {
      "name": "June",
      "type": "person"
    }
  ]
}
```

## Library Initialization

var cloudant = Cloudant({account:me, password:password});
If you would prefer, you can also initialize Cloudant with a URL:

#### Cloudant Url

```javascript
const url = 'https://MYUSERNAME:MYPASSWORD@MYACCOUNT.cloudant.com';
new Couchinator(url);
```

#### Bluemix

Running on Bluemix? You can initialize Cloudant directly from the VCAP_SERVICES environment variable:

```javascript
new Couchinator({
  instanceName: 'foo',
  vcapServices: JSON.parse(process.env.VCAP_SERVICES),
});
```

#### Account

```javascript
const url = 'https://MYUSERNAME:MYPASSWORD@MYACCOUNT.cloudant.com';
new Couchinator({ account: me, password: password });
```

## CLI Usage

Currently, the CLI only support a Cloudant URL.

```shell
> couchinator
  Usage: couchinator [options] [command]


  Commands:

    create
    recreate
    destroy

  Options:

    -h, --help        output usage information
    -V, --version     output the version number
    -u --url <url>    couchdb url
    -p --path <path>  resource path. Default ./cloudant-database
    -b --verbose      verbose logs
    -d --ddocsonly    import design docs only. Do no import other docs
```

## TODO / Errata

- if design doc name doesnt match its file name, we get a null crash

## License

[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
