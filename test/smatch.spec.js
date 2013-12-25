/* jshint esnext: true */

var match = require(BASE_DIR + '/lib/smatch');
var { clone } = require('cyclonejs');

describe('smatch', function() {
  'use strict';

  describe('simple matching', function() {
    function FooClass() {}

    var matchFn = function(v) {
      return match(v, function(case_) {
        case_('foo', () => 'You got foo');
        case_('bar', () => 'You got bar');
        case_(match.typeOf('string'), () => 'You got some other string: ' + v);
        case_(match.typeOf('number'), () => 'You got number ' + v);
        case_(match.instanceOf(FooClass), () => 'Instance of FooClass');
        case_(match.ANY, () => 'You got something else');
      });
    };

    it('matches primitives', function() {
      assert.strictEqual(matchFn('foo'), 'You got foo');
    });

    it('differentiates between primitives', function() {
      assert.strictEqual(matchFn('bar'), 'You got bar');
    });

    it("cascades down the case_ calls", function() {
      assert.strictEqual(matchFn('baz'), 'You got some other string: baz');
    });

    it('matches on types other than ones with direct ' +
       'values specified', function() {
      assert.strictEqual(matchFn(25), 'You got number 25');
    });

    it('matches on instances', function() {
      assert.strictEqual(matchFn(new FooClass()), 'Instance of FooClass');
    });

    it('allows for wildcard matching', function() {
      assert.strictEqual(matchFn(null), 'You got something else');
    });

    it('returns match.MISS if no match is found', function() {
      assert.strictEqual(match('foo', function(case_) {
        case_('bar', () => 'bar');
      }), match.MISS);
    });

    it('correctly matches null', function() {
      var m = match(null, function(case_) {
        case_(match.typeOf('object'), () => 'incorrect');
        case_(null, () => 'correct');
      });

      assert.strictEqual(m, 'correct');
    });

    it('matches against null with match.typeOf("null")', function() {
      var m = match(null, function(case_) {
        case_(match.typeOf('null'), () => 'correct');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'correct');
    });

    it('concisely matches multiple values with match.oneOf()', function() {
      var m = match(3, function(case_) {
        case_(match.oneOf('foo', 'bar', 3), () => 'correct');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'correct');
    });

    it('will not match with oneOf() if not included in arguments', function() {
      var m = match('1', function(case_) {
        case_(match.oneOf('2', 1), () => 'WRONG');
        case_(match.ANY, () => 'correct');
      });

      assert.strictEqual(m, 'correct');
    });

    it('matches objects by identity with oneOf()', function() {
      var o = {};
      var m = match(o, function(case_) {
        case_(match.oneOf(1, 2, o), () => 'correct');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'correct');
    });

    it('can take any function as a matcher', function() {
      var m = match('foo', function(case_) {
        case_((v) => (v.indexOf('fo') >= 0), () => 'correct');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'correct');
    });

    it('matches anything with match.ANY', function() {
      var m = match('hello', function(case_) {
        case_(match.ANY, () => 'yup');
      });

      assert.strictEqual(m, 'yup');
    });

    it('correctly matches NaN', function() {
      var m = match(NaN, function(case_) {
        case_(NaN, () => 'correct');
        case_(match.ANY, () => 'wrong');
      });

      assert.strictEqual(m, 'correct');
    });

  });

  describe('matching complex objects', function() {

    var spy, obj, arr;

    beforeEach(function() {
      spy = sinon.spy();
      obj = {
        foo: 1,
        bar: 2,
        baz: {
          a: 3,
          b: 'hello',
          c: {
            blah: 5
          }
        }
      };
      arr = [1, 2, {buckleMy: 'shoe'}];
    });

    it('will partially match objects by default', function() {
      var m = match(obj, function(case_) {
        case_({foo: 1, baz: {c: {blah: 5}}}, () => 'correct');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'correct');
    });

    it('deeply matches using match.exactly()', function() {
      var copy = JSON.parse(JSON.stringify(arr));
      var m = match(arr, function(case_) {
        case_(match.exactly(copy), () => 'works');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'works');
    });

    it('can extract variables', function() {
      match(arr, function(case_) {
        case_([1, '$0', '$1'], spy);
      });

      // Assert spy called with last two elements of arr
      sinon.assert.calledWithExactly.apply(
        sinon.assert, [spy].concat(arr.slice(1))
      );
    });

    it('disregards prototypes when using match.exactly()', function() {
      var F = function(foo) {
        this.foo = foo;
      };
      var f = new F(1);
      var m;

      F.prototype.bar = 'bar';

      m = match(f, function(case_) {
        case_(match.exactly({foo: 1}), () => 'correct');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'correct');
    });

    it('can extract deeply nested variables', function() {
      arr = ['wow', 'much matching', {
        a: {
          b: {
            c: {
              d: 'such nesting',
              foo: 1,
              bar: 2
            }
          },
          baz: 7
        },
        bing: 13
      }];

      match(arr, function(case_) {
        case_(['$1', 'much matching', {a: {b: {c: {d: '$0'}}}}], spy);
      });

      sinon.assert.calledWithExactly(spy, 'such nesting', 'wow');
    });

    it('will not incorrectly partially match them', function() {
      match(arr, function(case_) {
        case_([0, '$0', '$1'], spy);
      });

      sinon.assert.notCalled(spy);
    });

    describe('matching literal /\\$\\d+/ characters', function() {

      beforeEach(function() {
        obj = {a: '$1', b: 2};
      });

      it('uses match.raw() to accomplish this', function() {
        match(obj, function(case_) {
          case_({a: match.raw('$1')}, spy);
        });

        sinon.assert.called(spy);
      });

      it('will not incorrectly match "$" chars with match.raw()', function() {
        match(obj, function(case_) {
          case_({a: match.raw('$0')}, spy);
        });

        sinon.assert.notCalled(spy);
      });
    });

    describe('matching primtive wrappers and dates', function() {
      /* jshint -W053 */
      var DATE_TIME = Date.now();
      var number = new Number(1),
          string = new String('foo'),
          bool = new Boolean(true),
          date = new Date(DATE_TIME);
      
      function test(obj, type, right, wrong) {
        it('matches ' + type + ' objects using valueOf()', function() {

          match(obj, function(case_) {
            case_(right, spy);
          });

          sinon.assert.called(spy);
        });

        it('doesn\'t match ' + type + ' objects of a different value',
           function() {
          match(obj, function(case_) {
            case_(wrong, spy);
          });

          sinon.assert.notCalled(spy);
        });
      }

      test(number, 'number', new Number(1), new Number(2));
      test(string, 'string', new String('foo'), new String('bar'));
      test(bool, 'boolean', new Boolean(true), new Boolean(false));
      test(date, 'date', new Date(DATE_TIME), new Date(DATE_TIME + 10000));
    });

    describe('matching regex', function() {
      var re;

      beforeEach(function() {
        re = /[a-z\d]+/i;
      });

      it('matches if the source and flags are the same', function() {
        match(re, function(case_) {
          case_(/[a-z\d]+/i, spy);
        });

        sinon.assert.called(spy);
      });

      it('won\'t match if source is same but flags are different', function() {
        match(re, function(case_) {
          case_(/[a-z\d]+/gi, spy);
        });

        sinon.assert.notCalled(spy);
      });

      it('won\'t match if flags are same but source is different', function() {
        match(re, function(case_) {
          case_(/(?:[a-f\d]{3}){1,2}/i, spy);
        });

        sinon.assert.notCalled(spy);
      });
    }); // Matching regex
  }); // Matching objects

  describe('helper functions', function() {

    describe('#exactly', function() {
      /* jshint -W053 */
      var objects, copies;
      var DATE_TIME = Date.now();

      beforeEach(function() {
        objects = {
          plain: {foo: 1, bar: 2, baz: 3},
          nested: {foo: 1, bar: 2, baz: {bing: {bang: 3}}},
          array: [1, 2, 3],
          nestedArray: [1, 2, {buckleMy: 'shoe'}],
          regex: /foo/i,
          wrappedNum: new Number(1),
          wrappedStr: new String('hey'),
          wrappedBool: new Boolean(true),
          date: new Date(DATE_TIME),
          num: 1,
          str: 'hey',
          bool: true,
          nullValue: null,
          undefinedValue: undefined,
          nanValue: NaN
        };

        copies = Object.keys(objects).reduce(function(mem, key) {
          mem[key] = clone(objects[key]);
          return mem;
        }, {});
      });

      it('returns a function', function() {
        assert.isFunction(match.exactly({}));
      });

      it('returns true if two objects are the same', function() {
        assert.isTrue(match.exactly(objects.plain)(copies.plain));
      });

      it('returns false if two objects are different', function() {
        copies.plain.baz = {};
        assert.isFalse(match.exactly(objects.plain)(copies.plain));
      });

      it('returns true if two nested objects are the same', function() {
        assert.isTrue(match.exactly(objects.nested)(copies.nested));
      });

      it('returns false if two nested objects are different', function() {
        copies.nested.baz = {};
        assert.isFalse(match.exactly(objects.nested)(copies.nested));
      });

      it('returns true if two arrays are the same', function() {
        assert.isTrue(match.exactly(objects.array)(copies.array));
      });

      it('returns false if two arrays are different', function() {
        copies.array[3] = 'yo';
        assert.isFalse(match.exactly(objects.array)(copies.array));
      });

      it('returns true if two nested arrays are the same', function() {
        assert.isTrue(match.exactly(objects.nestedArray)(copies.nestedArray));
      });

      it('returns false if two nested arrays are different', function() {
        copies.nestedArray[2].buckleMy = 'something';
        assert.isFalse(match.exactly(objects.nestedArray)(copies.nestedArray));
      });

      it('returns true if a regex\'s source and flags match', function() {
        assert.isTrue(match.exactly(objects.regex)(copies.regex));
      });

      it('returns false if a regex\'s source doesn\'t match', function() {
        copies.regex = /notthesame/i;
        assert.isFalse(match.exactly(objects.regex)(copies.regex));
      });

      it('returns false if a regex\'s flags don\'t match', function() {
        copies.regex = new RegExp(objects.regex.source, 'm');
        assert.isFalse(match.exactly(objects.regex)(copies.regex));
      });

      it('returns true if two number objects hold the same value', function() {
        assert.isTrue(match.exactly(objects.wrappedNum)(copies.wrappedNum));
      });

      it('returns false if two nbr objects have different values', function() {
        copies.wrappedNum = new Number(objects.wrappedNum.valueOf() + 1);
        assert.isFalse(match.exactly(objects.wrappedNum)(copies.wrappedNum));
      });

      it('returns true if two string objects hold the same value', function() {
        assert.isTrue(match.exactly(objects.wrappedStr)(copies.wrappedStr));
      });

      it('returns false if two str objects have different values', function() {
        copies.wrappedStr = new String(objects.wrappedStr.valueOf() + 'a');
        assert.isFalse(match.exactly(objects.wrappedStr)(copies.wrappedStr));
      });

      it('returns true if two boolean objects hold the same value', function() {
        assert.isTrue(match.exactly(objects.wrappedBool)(copies.wrappedBool));
      });

      it('returns false if two bool objects have different values', function() {
        copies.wrappedBool = new Boolean(!objects.wrappedNum.valueOf());
        assert.isFalse(match.exactly(objects.wrappedBool)(copies.wrappedBool));
      });

      it('returns true if two Date objects are equal', function() {
        assert.isTrue(match.exactly(objects.date)(copies.date));
      });

      it('returns false if two Date objects differ', function() {
        copies.date = new Date(objects.date.getTime() + 10000);
        assert.isFalse(match.exactly(objects.date)(copies.date));
      });

      it('returns false if a date object is compared against ' +
         'an equivalent timestamp', function() {
        assert.isFalse(match.exactly(objects.date)(objects.date.getTime()));
      });

    });
  }); // helper functions
}); // smatch
