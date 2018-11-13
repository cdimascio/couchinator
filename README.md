# couchinator

![](https://img.shields.io/badge/status-stable-green.svg) ![](https://img.shields.io/badge/license-MIT-blue.svg)

Fixtures for [CouchDB](http://couchdb.apache.org/) and [IBM Cloudant](https://www.ibm.com/cloud/cloudant).

Setup ad teardown cloudant databases with ease. **couchinator** is a great tool for unit testing and more. couchinator is both a library and a command line utility.

<p align="center">
	<img src="https://github.com/cdimascio/couchinator/raw/master/assets/couchinator-anim.gif"/>
</p>

<p align="center">
	<img src="https://github.com/cdimascio/couchinator/raw/master/assets/couchinator.png" width="650"/>
</p>

Represent your database(s) as a set of folders and files, couchinator takes care of the rest.

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

```shell
couchinator create --url http://127.0.0.1:5984 --path ./fixtures
```

#### Create

```shell
couchinator create --url <COUCHDB-OR-CLOUDANT-URL> --path <RESOURCE_PATH>
```

#### Destroy

```shell
couchinator destroy --url <COUCHDB-OR-CLOUDANT-URL> --path <RESOURCE_PATH>
```

#### Recreate

```shell
couchinator recreate --url <COUCHDB-OR-CLOUDANT-URL> --path <RESOURCE_PATH>
```

**Note:** `RESOURCE_PATH` may be absolute path or a path relative to the current working directy

## Use the Library

#### Basic Usage

```javascript
const Couchinator = require('couchinator');

const couchinator = new Couchinator('http://127.0.0.1:5984').resources(
  './fixtures'
);

// The following methods return promises
couchinator.create();
couchinator.recreate();
couchinator.destroy();
```

see [Advanced Usage](#advanced-usage) for more library customization options

## Data Layout

The following sections describe how to create a data layout.

To skip directly to a working example, go [here](examples/db-resources)

### Getting Started

Couchinator enables you to represent CouchDB and Cloudant database(s) using a simple filesystem structure that mimics the actual database structure.

A couchinator filesystem data layout might look as such:

```shell
users
    _design
        students.json
	 teachers.json
    students-docs.json
    teachers-docs.json
classrooms
    _design
        classrooms.json
        classrooms-docs.json
```

### Create a data layout representing 2 databases

Let's create a data layout to describe two databases **users** and **classrooms**

1.  **Create two folders, one for `users` and another for `classrooms`.**

    ```shell
    users/
    classrooms/
    ```

    **Note:** Couchinator will use the folder name as the database name

2.  **Within each folder _optionally_ create a `_design` folder to store any design documents**

    ```shell
    users/
        _design/
    classrooms/
        _design/
    ```

3.  **Create design document(s) and store them in the appropriate `_design` folder**

    In the example below, we create two design documents in the `schools` database and one in the `users` database.

        	```shell
        	users/
        	    _design/
        	        students.json
        	        teachers.json
        	classrooms/
        	    _design/
        	        classrooms.json
        	```

        	The contents of each design document `.json` must be a valid CouchDB [design document]([design document](http://docs.couchdb.org/en/2.0.0/json-structure.html#design-document)).

        	For example, `students.json`:

    ```json
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

4.  **Create the data to store in each database**

    - Data must be stored using CouchDB's [bulk document](http://docs.couchdb.org/en/2.0.0/json-structure.html#bulk-documents) format
    - The data may be stored in a _single_ JSON file or spread across _multiple_ JSON files (useful for organizing data)

    ```shell
    users/
        _design/
            students.json
            teachers.json
        students-docs.json   # contains student data
        teachers-docs.json   # contains teacher data

    classrooms/
        _design/
            classrooms.json
        users-docs.json
    ```

For example, `student-docs.json` contains students

```json
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

5. **Run couchinator to create each database**

   Assuming the data layout is stored in the folder `./fixtures`, run the following command(s):

   ```shell
   couchinator create --url http://127.0.0.1:5984 --path ./fixtures
   ```

## Data Layout Example

To view a complete data layout example, see [examples/db-resources](examples/db-resources).

To run the the example:

- clone this repo
- `cd examples`
- edit examples.js and set `<CLOUDANT-URL>` to your cloudant url
- Run `node example`
- Your database should now contain documents

## Library Initialization

var cloudant = Cloudant({account:me, password:password});
If you would prefer, you can also initialize Cloudant with a URL:

#### Cloudant Url

```javascript
const url = 'https://MYUSERNAME:MYPASSWORD@MYACCOUNT.cloudant.com';
new Couchinator(url);
```

#### Account

```javascript
const url = 'https://MYUSERNAME:MYPASSWORD@MYACCOUNT.cloudant.com';
new Couchinator({ account: me, password: password });
```

#### Advanced Usage

```javascript
const Generator = require('couchinator');
const path = require('path');

// Define the directory that contains our db resources
const resourcePath = path.join(process.cwd(), 'db-resources');

const c = new Couchinator('<YOUR-DB-URL>')
  .resources(resourcePath)
  .visitor(e => {
  		if (e.level >= 30) console.log(e.msg);
	})
  .configure();
```

## Apis

- **`couchinator create`**

  Creates all databases, design documents, and executes any bulk documents represented in the [data layout](#data-layout). If a design document exists, the design document is updated to reflect the version currently represented in the [data layout](#data-layout).

  Using the `--ddocsonly` flag skips any bulk documents. This flag is particulary useful when you simply want to add/update design documents.

- **`couchinator destroy`**

  destroys all databases represented in the [data layout](#data-layout).

- **`couchinator rcreate`**
  Calls destroy followed by create.

See [CLI Usage](#cli-usage) section for additional arguments.

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
