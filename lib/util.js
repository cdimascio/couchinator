const fs = require('fs');
const path = require('path');

module.exports = {
  directories(srcpath) {
    return new Promise((resolve, reject) => {
      fs.readdir(srcpath, (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });
  },
  
  files(srcpath) {
    return new Promise((resolve, reject) => {
      fs.readdir(srcpath, (err, r) => {
        if (err) reject(err)
        else resolve(r.filter(file => (!fs.statSync(path.join(srcpath, file)).isDirectory() && file.endsWith(".json"))));
      });
    })
  }
};
