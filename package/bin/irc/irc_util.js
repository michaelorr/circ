// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";
  var arrayBuffer2String, concatArrayBuffers, exports, normaliseNick, string2ArrayBuffer, _base, _ref, _ref1,
    __slice = [].slice;

  var exports = (_ref = (_base = ((_ref1 = window.irc) != null ? _ref1 : window.irc = {})).util) != null ? _ref : _base.util = {};

  exports.parseCommand = function(data) {
    var parts, str;
    str = $.trim(data.toString('utf8'));
    parts = /^(?::([^\x20]+?)\x20)?([^\x20]+?)((?:\x20[^\x20:][^\x20]*)+)?(?:\x20:(.*))?$/.exec(str);
    if (!parts) {
      throw new Error("invalid IRC message: " + data);
    }
    /*
       * could do more validation here...
       * prefix = servername | nickname((!user)?@host)?
       * command = letter+ | digit{3}
       * params has weird stuff going on when there are 14 arguments
    */

    /*
       * trim whitespace
    */

    if (parts[3] != null) {
      parts[3] = parts[3].slice(1).split(/\x20/);
    } else {
      parts[3] = [];
    }
    if (parts[4] != null) {
      parts[3].push(parts[4]);
    }
    return {
      prefix: parts[1],
      command: parts[2],
      params: parts[3]
    };
  };

  exports.parsePrefix = function(prefix) {
    var p;
    p = /^([^!]+?)(?:!(.+?)(?:@(.+?))?)?$/.exec(prefix);
    return {
      nick: p[1],
      user: p[2],
      host: p[3]
    };
  };

  exports.makeCommand = function() {
    var cmd, opt_lastArgIsMsg, params, _i, _params;
    cmd = arguments[0], params = 3 <= arguments.length ? __slice.call(arguments, 1, _i = arguments.length - 1) : (_i = 1, []), opt_lastArgIsMsg = arguments[_i++];
    if (opt_lastArgIsMsg !== true) {
      params.push(opt_lastArgIsMsg);
    }
    _params = (function() {
      if (params && params.length > 0) {
        if (!params.slice(0, params.length - 1).every(function(a) {
          return !/^:|\x20/.test(a);
        })) {
          throw new Error("some non-final arguments had spaces or initial colons in them");
        }
        if (/^:|\x20/.test(params[params.length - 1]) || opt_lastArgIsMsg === true) {
          params[params.length - 1] = ':' + params[params.length - 1];
        }
        return ' ' + params.join(' ');
      } else {
        return '';
      }
    })();
    return cmd + _params + "\x0d\x0a";
  };

  exports.randomName = function(length) {
    var chars, x;
    if (length == null) {
      length = 10;
    }
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return ((function() {
      var _i, _results;
      _results = [];
      for (x = _i = 0; 0 <= length ? _i < length : _i > length; x = 0 <= length ? ++_i : --_i) {
        _results.push(chars[Math.floor(Math.random() * chars.length)]);
      }
      return _results;
    })()).join('');
  };

  exports.normaliseNick = normaliseNick = function(nick) {
    return nick.toLowerCase().replace(/[\[\]\\]/g, function(x) {
      return {
        '[': '{',
        ']': '}',
        '|': '\\'
      }[x];
    });
  };

  exports.nicksEqual = function(a, b) {
    var _ref2;
    if (!((typeof a === (_ref2 = typeof b) && _ref2 === 'string'))) {
      return false;
    }
    return (a != null) && (b != null) && normaliseNick(a) === normaliseNick(b);
  };

  exports.toSocketData = function(str, cb) {
    return string2ArrayBuffer(str, function(ab) {
      return cb(ab);
    });
  };

  exports.fromSocketData = function(ab, cb) {
    return arrayBuffer2String(ab, cb);
  };

  exports.emptySocketData = function() {
    return new ArrayBuffer(0);
  };

  exports.concatSocketData = function(a, b) {
    return concatArrayBuffers(a, b);
  };

  exports.arrayBufferConversionCount = 0;

  exports.isConvertingArrayBuffers = function() {
    return exports.arrayBufferConversionCount > 0;
  };

  /**
   * Converts an array containing uint8 values to an ArrayBuffer.
   * @param {Array.<number>} array An array of values in the range [0, 255].
   * @return {ArrayBuffer} An array buffer containing the byte representation of
   *     the passed in array.
   */
  exports.arrayToArrayBuffer = function(array) {
    var arrayBuffer = new ArrayBuffer(array.length);
    var arrayView = new Uint8Array(arrayBuffer);
    arrayView.set(array);
    return arrayBuffer;
  };

  function createBlob(src) {
    var BB = window.BlobBuilder || window.WebKitBlobBuilder;
    if (BB) {
      bb = new BB();
      bb.append(src);
      return bb.getBlob();
    }
    return new Blob([src]);
  }

  concatArrayBuffers = function(a, b) {
    var result, resultView;
    result = new ArrayBuffer(a.byteLength + b.byteLength);
    resultView = new Uint8Array(result);
    resultView.set(new Uint8Array(a));
    resultView.set(new Uint8Array(b), a.byteLength);
    return result;
  };

  string2ArrayBuffer = function(string, callback) {
    var blob, f;
    exports.arrayBufferConversionCount++;
    blob = createBlob(string);
    f = new FileReader();
    f.onload = function(e) {
      exports.arrayBufferConversionCount--;
      return callback(e.target.result);
    };
    return f.readAsArrayBuffer(blob);
  };

  arrayBuffer2String = function(buf, callback) {
    var blob, f;
    exports.arrayBufferConversionCount++;
    blob = createBlob(buf);
    f = new FileReader();
    f.onload = function(e) {
      exports.arrayBufferConversionCount--;
      return callback(e.target.result);
    };
    return f.readAsText(blob);
  };

}).call(this);
