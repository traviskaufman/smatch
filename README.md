smatch
======

_Note: Currently Under Development_

Scala-style pattern matching for Javascript!

smatch is an interpretation of scala's pattern-matching mechanisms for
javascript. It pairs very nicely with ES6's new fat arrow syntax for maximum
readability and conciseness, although it will work in any ES5 environment
thanks to Traceur.

## Simple Example

```javascript
  var result = match(someValue, function(case_) {
    case_('foo', () => 'You got foo');
    case_('bar', () => 'You got bar');
    case_(match.typeOf('string'), () => 'You got some other string ' + someValue);
    case_(match.typeOf('number'), () => 'You got number ' + someValue);
    case_(match.instanceOf(FooClass), () => 'You got an instance of FooClass');
    case_(match.ANY, () => 'You got something else');
  });

  console.log(result);
```

## Matching Arrays

```javascript

match(someArray, function(case_) {
  case_([1, 2, {buckleMy: 'shoe'}], () => 'The array example Travis always uses');
  case_(
    ['1', '$0', '$1'],
    (item2, item3) => 'Array with 1 as first el, ' +
                      'followed by ' + item2 +
                      ' and ' + item3
  );

  // NOT IMPLEMENTED YET
  case_(match.instanceOf(Array), {
    if: (a) => a[12] > 100,
    then: () => 'The 12th item in the array - ' + a[12] + ' - is greater than 100',
    else: () => 'The 12th item in the array is <= 100'
  });
});

```

## Matching Objects

```javascript
  match(someObject, function(case_) {
    case_({foo: 1}, () => 'Has "foo" property with value 1'
    case_({foo: '$0'}, (fooValue) => 'Object w/ foo value of ' + fooValue);
    case_({foo: {
      bar: {
        baz: '$0'
      },
      bling: '$1'
    }, (nested, top) => 'foo.bar.baz = ' + nested + '. bling = ' + top);
  });
```

## Matching Actual dollar signs (NOT IMPLEMENTED YET)
```javascript
  match('$0', function(case_) {
    case_(match.raw('$0'), () => 'Special char input');
  });
```

## Concise Matching (NOT IMPLEMENTED YET)
```javascript
  match(someString, function(case_) {
    case_(match.oneOf('foo', 'bar', 'baz'), (value) => 'One of foo, bar, or ' +
                                                       'baz: ' + value);
  });
```
