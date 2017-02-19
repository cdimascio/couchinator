
const defaultVisitor = function (msg) {
  if (msg.error) console.error(msg);
  else console.log(msg);
}

module.exports = function Logger(visitor) {
  visitor = visitor || defaultVisitor;
  return {
    debug(msg, data, r) {
      r = r || data;
      visitor({ msg, level: 20 })
      return r;
    },

    info(msg, data, r) {
      r = r || data;
      visitor({ msg, level: 30 })
      return r;
    },
  
    error(msg, error) {
      visitor({ msg, error, level: 50 });
      return error;
    }
  };
}
