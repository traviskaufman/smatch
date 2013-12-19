(function(global) {
  'use strict';

  var MISS = Symbol('match miss');
  var ANY = Symbol('wildcard');
  var EXTRACTION = Symbol();
  var RAW = Symbol();

  var isPrimitive = (v) => v === null || ~[
    'undefined', 'number', 'string', 'boolean'
  ].indexOf(typeof v);

  var isObject = (v) => v !== null && typeof v == 'object';

  var hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

  var extractToken = /^\$(\d+)$/;

  var setResult = function(v, result) {
    if (result === MISS) {
      return v;
    }

    return result;
  };

  var klass = (obj) => Object.prototype.toString.call(obj).substring(8, -1);
  var builtinClasses = [
    'Number', 'String', 'Object', 'Array', 'Date',
    'RegExp', 'Boolean'
  ];

  var extract = (str) => (str.match(extractToken) || [])[1];

  /**
   * Ensure that matcher has _at least_ the same deeply equal keys as obj.
   * matcher does not have to have _all_ of the keys matcher has, but every key
   * in matcher must be present in `obj` and have the same value. Also looks for
   * extraction tokens and substitues each of them into an array.
   *
   * @return {Array|null} List of extractions, if any, from the object. Returns
   *  null if the partial match fails.
   * @private
   */
  var partiallyMatchAndExtract = function(obj, matcher, extractions=[]) {
    var k, matcherItem, objItem, extIdx;
    for (k in matcher) {
      if (hasOwn(matcher, k)) {
        if (!hasOwn(obj, k)) {
          return null;
        }

        [matcherItem, objItem] = [matcher[k], obj[k]];


        if (
          typeof matcherItem == 'string' &&
          (extIdx = extract(matcherItem))
        ) {
          extractions[extIdx] = objItem;
          continue;
        } else if (hasOwn(matcherItem, RAW)) {
          // Extract any raw values and turn them into the matcherItem.
          matcherItem = matcherItem[RAW];
        }

        if (
          isPrimitive(matcherItem) && isPrimitive(objItem) &&
          matcherItem === objItem
        ) {
          continue;
        } else if (isPrimitive(matcherItem) || isPrimitive(objItem)) {
          return null;
        } else if (hasOwn(matcherItem, RAW)) {
          return matcherItem[RAW] === objItem;
        } else if (
            !partiallyMatchAndExtract(objItem, matcherItem, extractions)
        ) {
          return null;
        }
      }
    }

    return extractions;
  };

  var deepEqual = function(o1, o2) {
    var isO1Primitive = isPrimitive(o1);
    var isO2Primitive = isPrimitive(o2);
    var o1Class = klass(o1);
    var o2Class = klass(o2);
    var k;

    if (isO1Primitive && isO2Primitive) {
      return o1 === o2;
    }

    if (isO1Primitive || isO2Primitive) {
      // Primitives !== Objects
      return false;
    }

    if (o1Class == 'Global') {
      return o2Class == 'Global';
    }

    if (~builtinClasses.indexOf(o1Class) || ~builtinClasses.indexOf(o2Class)) {
      return o1.valueOf() === o2.valueOf();
    }

    if (Object.keys(o1).length != Object.keys(o2).length) {
      return false;
    }

    for (k in o1) {
      if (hasOwn(o1, k) && hasOwn(o2, k) && deepEqual(o1[k], o2[k])) {
        continue;
      } else {
        return false;
      }
    }

    return true;
  };

  var match = function(value, partialFn) {

    var result = MISS;

    var case_ = function(matchValue, fn) {
      if (result !== MISS) {
        // We've already found something
        return;
      }

      if (isPrimitive(matchValue) && matchValue === value) {
        result = setResult(fn(), result);
      } else if (isObject(matchValue)) {
        var extractions = partiallyMatchAndExtract(value, matchValue);
        if (extractions) {
          result = setResult(fn.apply(null, extractions), result);
        }
      } else if (typeof matchValue == 'function' && matchValue(value)) {
        result = setResult(fn(), result);
      } else if (matchValue === ANY) {
        result = setResult(fn(), result);
      }
    };

    partialFn(case_);
    return result;
  };


  match.typeOf = (typeStr) => function(v) {
   var t = typeof v;
   // TODO: what's the best way to handle this?
   if (t == 'object' && v === null) {
     return '';
   }

   return t === typeStr;
  };

  match.raw = function(v) {
    var o = Object.create(null);
    o[RAW] = v;
    return o;
  };

  match.instanceOf = (ctor) => (v) => v instanceof ctor;

  match.exactly = (obj) => (v) => deepEqual(obj, v);

  match.MISS = MISS;
  match.ANY = ANY;

  if (typeof module == 'object' &&
      typeof module.exports == 'object') {
    module.exports = match;
  } else if (typeof define == 'function' && define.amd) {
    define(function() { return match; });
  } else {
    global.match = match;
  }
})(this);
