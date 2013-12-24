smatch
======

Scala-style pattern matching for Javascript!

smatch is an interpretation of [scala's pattern-matching
mechanisms](http://www.scala-lang.org/old/node/120) for
javascript. It uses a declarative API that allows for expression-oriented
programming, providing maximum code clarity by ridding your code of
complex and/or verbose conditional logic that's normally needed to check
objects. This allows you to clearly specify the intent of your program, leading
to better readability and maintainability.

smatch is built to work in every environment possible. It tries to make use of
ES5 (and some ES6) features when available, but always falls back to plain ES3
when those features are unavailable. It can be used with CommonJS, AMD, or
plain old vanilla JS environments.

## Installation
Installation can be done via npm

```sh
$ npm install smatch
```

However, a minified, production-ready version, found in the `dist/` dir, can be
used for browser-based environments.

smatch exposes a single function that is used for pattern-matching, which you
can access a variety of ways depending on your environment.

Node/CommonJS:

```javascript
var match = require('smatch');
// use match ...		
```

AMD/RequireJS:

```javascript
require(['/path/to/smatch'], function(match) {
  // start using match...
});
```

Plain old Vanilla:

```javascript
(function(global) {
  var match = global.match;
  // start using match ...
});
```

## Usage

_Note that the following examples make use of ES6's fat arrow functions for
maximum readability and conciseness, however regular `function() ...`
statements can be used in place of these._

### Simple Example

```javascript
var myMatchFn = (someValue) => match(someValue, function(case_) {
	case_('foo', () => 'You got foo');
	case_('bar', () => 'You got bar');
	case_(match.typeOf('string'), () => 'You got some other string ' + someValue);
	case_(match.typeOf('number'), () => 'You got number ' + someValue);
	case_(match.instanceOf(Date), () => 'You got a Date');
	case_(match.ANY, () => 'You got something else');
});

console.log(myMatchFn('foo')); // => 'You got foo'
console.log(myMatchFn('bar')); // => 'You got bar'
console.log(myMatchFn('a string!')); // => 'You got some other string a string!'
console.log(myMatchFn(250)); // => 'You got number 250'
console.log(myMatchFn(new Date())); // => 'You got a date!'
console.log(myMatchFn({foo: 'bar', baz: 12})); // => 'You got something else'
```

#### How it works

The `match` function takes any value as its first argument, and a function as a
second argument that takes one variable, which is itself a function as is used
to emulate scala's `case` statement, hence why it's called `case_` both
internally and in these docs.

As soon as a `case_` statement is matched against, the return value from the corresponding function in the second argument to a `case_` statement is returned to the caller of `match`. `case_` functions, much like the `case` statement, cascade from top to bottom, so if the callback for the first `case_` function where the first argument is matched against will be invoked, and that value will be returned. 

The `case_` function works in the following way:

* If a primitive value is specified as the first argument, then it will be compared using `===` to the first argument to `match`, and if they're equal the callback will be invoked.
* If a _function_ is given, the `case_` statement will call the function and pass it the first argument to `match`. If that function returns any truthy value, it will be considered a match and the callback will be invoked. This is how `match.typeOf`, `match.instanceOf`, and other work: they are all [higher-order functions](http://en.wikipedia.org/wiki/Higher-order_function) that output functions which `case_` invokes.
* If a non-callable object is given, `case_` takes a series of steps. Read the next section for more info on this…

If there are no matches found, `match.MISS` will be returned. `match.MISS` is a singleton object that will only be returned if _no_ match whatsoever is found.

```javascript
var m = match('hey', function(case_) {
	case_('foo', () => 'blah');
});
console.log(m === match.MISS); // => true
```

### Matching Objects

Matching objects using smatch differs from how one normally treats "object equality" in javascript. When an object is given as the first argument `match`, any object specified as an argument within its `case_` calls _will_ match using the following scheme:

* If the object is a `Date`, `Number`, `Boolean`, or `String`, the result of calling `valueOf()` on both objects is directly compared.
* If the object is a `RegExp`, the source and flags are compared.
* Otherwise, for every direct key in the object specified as the first argument to `case_`, if there is a corresponding key in the first argument to `match`, and the values for both of those keys are the same, then the match will be considered valid.

The following example demonstrates this:

```javascript
var someObject = {foo: 'bar', baz: 1, bing: {bang: 'boom'}};
var m = match(someObject, function(case_) {
	case_({foo: 'bar'}, () => 'Some object with property foo = "bar"');
	case_(match.ANY, () => 'Something else');
});

console.log(m); // => 'Some object with property foo = 'bar' 
```

#### Property Extraction

Objects can also have property values extracted from them to be passed to the callback functions. This is one of the most powerful aspects of pattern matching.

```javascript
// Logs 'boom'
match(someObject, function(case_) {
  case_({bing: {bang: '$0'}}, console.log.bind(console));
});
```

The `$N` string is called an _extract token_, and is used to specify that if a property exists for that object, pass it as the `N`th argument to the callback function.

As an example, here's some code that uses `match` to display tweets that a user has retweeted, showing the author name, screen name, and tweet text.

```javascript
$.ajax({
	url: 'https://api.twitter.com/1.1/statuses/home_timeline.json',
	dataType: 'json',
	headers: {
		'Authorization': 'Bearer ' + ACCESS_TOKEN
	},
	data: {
		count: 200
	}
}).then(printTweets, handleError);

function printTweets(tweets) {
  var tweet$Els = tweets.map((tweet) => match(tweet, function(case_) {
  	case_({
  		retweeted: true,
  		user: {
  			name: '$0',
  			screen_name: '$1',
  		},
  		text: '$2'
    }, (user, sn, text) => $(
      ['<p>', user, '(@' + sn + ')', '-', text, '</p>'].join(' ')
    ));
  })).filter((result) => result !== match.MISS);
  
  $('#tweets').append(tweet$Els);
}
```

### Writing your own functions for `case_`

As described above, if `case_` encounters a function as its first argument, it will invoke that function with its value, and will match if the function returns _any_ truthy value. This allows you to easily write your own matching functions for `case_`.

```javascript
function oddEvenPartition(numbers) {
  var [odds, evens] = [[], []];
  
  numbers.forEach(function(n) {
  	match(n, function(case_) {
  		case_((n) => n % 2 === 0, () => evens.push(n));
  		case_(match.ANY, () => odds.push(n));
  	});
  });  
  
  return [odds, evens];
}
```

### Built-in `match` helper functions

While it's easy to write your own matching functions, `match` ships with a number of higher-order matching functions that can be used as the first argument to any `case_` call:

#### match.typeOf(_typeStr_)

Returns a function that will call `typeof` on the value passed to `match()`, and if the returned result matches `typeStr`, it'll be considered a match, _except_ in the case of `null`. `match.typeOf` knows that `null` is _not_ an object, so `null` won't match for `match.typeOf('object')`. To match null type, use `match.typeOf('null')`. 

#### match.instanceOf(_ctor_)

Returns a function that will call `instanceof` on the value passed to `match()`, and if that value is an instance of _ctor_, it will be considered a match.

#### match.exactly(_obj_)

Returns a function that deeply compares the value passed to `match()` against `obj`, and will match if they're deeply equal. This differs from normal object matching as objects must appear exactly the same. However Date, String, Number, Boolean, and RegExp objects are compared the same as in regular object matching.

#### match.raw(_v_)

Returns a function that compares the exact identity of _v_ to the value passed to `match()`, and if they're the same it will be considered a match. This function is useful for testing for object identity, and for matching against strings that would otherwise be considered extract tokens, such as US currency:

```javascript
match(nycBarPrices, function(case_) {
	case_(match.raw('$5'), () => 'PBR/Natty/Keystone');
	case_(match.raw('$7'), () => 'Well shot');
	case_(match.raw('$12'), () => 'Call drink');
	case_(match.raw('$20'), () => 'Premium');
	case_(match.raw('$50'), () => 'Top Shelf');
	case_((v) => parseInt(v.slice(1), 10) > 50), () => "You're a tool");
});
```

#### match.oneOf(_…list_)

Returns a function that takes a number of arguments and will match if the value passed to `match()` is any one of those specified in list. Uses `===` to compare.

## License

The MIT License (MIT)

Copyright (c) 2013 Travis Kaufman

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

