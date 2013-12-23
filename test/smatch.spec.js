var match = require(BASE_DIR + '/lib/smatch');

describe('smatch', function() {
  /* jshint esnext: true */
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
        console.log('testing', obj);
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
}); // smatch
