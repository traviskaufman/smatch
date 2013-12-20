(function(global) {
  'use strict';

  /** @see {@link match#MISS} */
  var MISS = Symbol('match miss');
  /** @see {@link match#ANY} */
  var ANY = Symbol('wildcard');

  /**
   * Used to indicate whether or not this match should be an extraction or not.
   *
   * @constant {Symbol}
   * @private
   */
  var EXTRACTION = Symbol();

  /**
   * Used as a property to indicate that a string literal matching an extract
   * token ("$1", for example) should not be treated as an extract token but as
   * a literal string.
   *
   * @see {@link match#raw}
   * @constant {Symbol}
   * @private
   */
  var RAW = Symbol();

  /**
   * List of primitive types as strings, excluding null.
   *
   * @constant {Array.<string>}
   * @private
   */
  var PRIMITIVES = ['undefined', 'number', 'boolean', 'string'];

  /**
   * List of `[[Class]]`es of ES built-in objects, excluding global and exotic
   * objects. Basically any objects that you can call valueOf() on to get their
   * values, instead of enumerating through them.
   *
   * @constant {Array.<string>}
   * @private
   */
  var BUILTINS = ['Number', 'String', 'Date', 'RegExp', 'Boolean'];

  /**
   * This is the token used to tell match to extract whatever value it finds at
   * this position and pass it to the case_ callback function.
   *
   * @constant {RegExp}
   * @private
   */
  var EXTRACT_TOKEN = /^\$(\d+)$/;

  /**
   * Checks whether or not a given value is a primitive.
   *
   * @param {*} v - The value to check.
   * @returns {boolean} True if the value is a primitive, false otherwise.
   * @private
   */
  var isPrimitive = (v) => v === null || ~PRIMITIVES.indexOf(typeof v);

  /**
   * Checks whether or not a given value is an object, but not a function.
   *
   * @param {*} v - The value to check.
   * @returns {boolean} True if the value is a non-callable object,
   *  false otherwise.
   * @private
   */
  var isObject = (v) => v !== null && typeof v == 'object';

  /**
   * Safely checks whether or not an object directly contains a given property.
   *
   * @param {Object} obj - The object to check.
   * @param {string} prop - The name of the property to check for on the object.
   * @returns {boolean} True if the property is a direct property of the object.
   * @private
   */
  var hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

  /**
   * Used to set the final result from a call to match(). Used internally by
   * the case_() function. Will only set the result if it hasn't already been
   * set.
   *
   * @param {*} v - The value to set the result as
   * @param {*} result - The current result within the match() function.
   * @returns {*} Either the value passed in if there isn't already a result
   *  set, or the current result if there is.
   * @private
   */
  var setResult = function(v, result) {
    if (result === MISS) {
      return v;
    }

    return result;
  };

  /**
   * Retrieve the internal [[Class]] property of an object via
   * `Object.prototype.toString`.
   *
   * @param {Object} obj - The object to get the [[Class]] prop from.
   * @returns {string} The [[Class]] of `obj`.
   * @private
   */
  var klass = (obj) => Object.prototype.toString.call(obj).substring(8, -1);

  /**
   * Given a string, will return the value representing the position in which
   * partiallyMatchAndExtract should place the value this extraction represents
   * in.
   *
   * @param {string} str - The string that may or may not have an extract token.
   * @returns {(string|undefined)} Either the string representing the index to
   *  place the extraction, or undefined indicating that this string is not an
   *  extract token.
   * @see {@link partiallyMatchAndExtract}
   * @private
   */
  var extract = (str) => (str.match(EXTRACT_TOKEN) || [])[1];

  /**
   * Ensure that matcher has _at least_ the same deeply equal keys as obj.
   * matcher does not have to have _all_ of the keys obj has, but every key
   * in matcher must be present in `obj` and have the same value. Also looks for
   * extraction tokens and substitues each of them into an array.
   *
   * @param {Object} obj - The object to partially match against.
   * @param {Object} matcher - The object containing that will be partially
   *  matched with `obj.`
   * @param {Array} [extractions=[]] - A list of extractions that have already
   *  been pulled out of a partial match with between `obj` and `matcher`. Used
   *  internally by the function.
   * @return {?Array} List of extractions, if any, from the object.
   *  Returns null if the partial match fails.
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

  /**
   * Check that one object deeply equals another. Used with match.exactly().
   *
   * @param {Object} o1 - Object to compare.
   * @param {Object} o2 - Object to compare against.
   * @returns {boolean} True if the objects are deeply equal, false otherwise.
   * @see {@link match#exactly}
   */
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

    if (~BUILTINS.indexOf(o1Class) || ~BUILTINS.indexOf(o2Class)) {
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

  /**
   * Emulates Scala's `match` directive. Given a value, and a function
   * consisting of a number of `case_` calls, this will check each `case_` call
   * and behave in the following manner:
   *
   * * If the first argument to `case_` is a primitive, it will be directly
   * compared against that value, and if it is equal, will invoke the callback
   * given as the second argument to it.
   * * If the first argument is a function, it will call that function with the
   * value given to match(), and if it returns anything truthy, it will invoke
   * the callback given as the second argument.
   * * If the first argument is an object, it will attempt to partially match
   * against the object. That is, it will make sure that the value given to
   * match has at _least_ equal properties with the value given. Then, if there
   * are any extract tokens specified within the object, it will grab all of
   * them and when it invokes the callback, it will pass each value along in
   * the position specified by the token. So for example `[0, '$0', '$1']`,
   * when used as a matcher against the array `[0, 1, 2]` will invoke that
   * `case_` function's callback with the arguments `(1, 2)`. However, if the
   * matcher `[0, '$1', '$0']` was used, the `case_` function's callback would
   * be invoked with arguments `(2, 1)`. Consequently, `[0, '$1', '$2']` will
   * invoke the callback with arguments `(undefined, 1, 2)`.
   *
   * Whenever a case_ function callback is invoked, the return value from that
   * callback will be returned from `match.`
   *
   * @param {*} value - Any value to match against.
   * @param {Function} partialFn - The function responsible for executing
   *  `case_` statements, and returning a value for a given match. This
   *  function is passed as a single parameter, the `case_` function (or really
   *  whatever you want to call it; in these docs and in the code it's referred
   *  to as `case_`, as this is what the statement is called in Scala), which
   *  can be used to match against values and then return a value if there is
   *  a match. See the examples for more information.
   * @returns {*} The return value of the invoked callback from the _first_
   *  successfully-matched `case_` call.
   * @public
   */
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


  /**
   * Returns a function that tests whether or not a given object is of a certain
   * type. Note that this function is smart enough not to match `null` with
   * `typeof` value of 'object'. If you want to check that something is a null
   * type, use `match.typeOf('null')`, which was going to be standard in ES6
   * but got rejected because too much pre-existing code is relying on this
   * quirk :(.
   *
   * @param {string} typeStr - The 'type' string.
   * @returns {Function} A function that accepts an object and tests whether or
   *  not the `typeof` that object is of type `typeStr`.
   * @memberof match
   * @public
   */
  match.typeOf = (typeStr) => function(v) {
    var t = typeof v;
    // TODO: what's the best way to handle this?
    if (v === null) {
      return typeStr === 'null';
    }

    return t === typeStr;
  };

  /**
   * Takes a given value and ensures that when it's matched against, it's
   * always treated as that literal value. This is most commonly used for
   * matching against strings that resemble extract tokens, such as "$15"
   *
   * @param {*} v - The value to ensure is treated literally. Note: If an
   *  object is given to raw(), it will be compared using ===, and not a deep
   *  comparison.
   * @returns {Object} - Object that's used internally to identify raw, literal
   *  values.
   * @memberof match
   * @public
   */
  match.raw = function(v) {
    var o = Object.create(null);
    o[RAW] = v;
    return o;
  };

  /**
   * Returns a function that will check if a given object is an `instanceof`
   * the constructor passed to this function.
   *
   * @param {Function} ctor - The constructor function that will be used in the
   *  `instanceof` check.
   * @return {Function} A function that takes an object and tests whether or
   *  not it is an instance of the specified constructor function.
   * @memberof match
   * @public
   */
  match.instanceOf = (ctor) => (v) => v instanceof ctor;

  /**
   * Returns a function that, when given a value, will return true if and only
   * if the object is deeply equal to `obj.` This is different than the default
   * "partially matching" algorithm used by match in that it will ensure that
   * the object being compared is pretty much idential to `obj`. When we say
   * "pretty much identical", we mean that for every direct property that
   * exists in `obj`, there is also that direct property existent on the object
   * passed in, and the values returned from accessing both properties are
   * deeply equal.
   *
   * @param {*} obj - The value to that will be deeply compared against in the
   *  returned function.
   * @returns {Function} A function that takes an object and deeply compares it
   *  to `obj`.
   * @memberof match
   * @public
   * @todo Handle circular references within objects.
   */
  match.exactly = (obj) => (v) => deepEqual(obj, v);

  /**
   * Sentinel value that's returned from a `match()` call _only_ when no match
   * has been found for the given value in that function.
   *
   * @type {Symbol}
   * @memberof match
   * @public
   */
  match.MISS = MISS;

  /**
   * This can be used in a `case_` call to match against _any_ value given.
   * This is usually put as the last `case_` call in a `match()` function as it
   * will catch any value that hasn't already been matched. It is equivalent to
   * scala's wildcard matcher (`_`).
   *
   * @type {Symbol}
   * @memberof match
   * @public
   */
  match.ANY = ANY;

  // Exports for CommonJS/AMD/Global object.
  if (typeof module == 'object' &&
      typeof module.exports == 'object') {
    module.exports = match;
  } else if (typeof define == 'function' && define.amd) {
    define(function() { return match; });
  } else {
    global.match = match;
  }
})(this);
