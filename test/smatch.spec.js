var match = require(BASE_DIR + '/src/smatch');

describe('smatch', function() {

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

  });

  describe('Arrays', function() {

    it('deeply matches arrays', function() {
      var a = [1, 2, {buckleMy: 'shoe'}];
      var copy = JSON.parse(JSON.stringify(a));
      var m = match(a, function(case_) {
        case_(match.exactly(copy), () => 'works');
        case_(match.ANY, () => 'WRONG');
      });

      assert.strictEqual(m, 'works');
    });

    it('can extract variables from arrays', function() {
      var a = [1, 2, 3];
      var spy = sinon.spy();

      match(a, function(case_) {
        case_([1, '$0', '$1'], spy);
      });
      
      sinon.assert.calledWithExactly(spy, 2, 3);
    });

    it('can extract deeply nested variables from arrays', function() {
      var a = ['wow', 'much matching', {
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
      var spy = sinon.spy();

      match(a, function(case_) {
        case_(['$1', 'much matching', {a: {b: {c: {d: '$0'}}}}], spy);
      });

      sinon.assert.calledWithExactly(spy, 'such nesting', 'wow');
    });

  });

});
