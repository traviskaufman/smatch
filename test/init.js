var _p = require('path'), resolve = _p.resolve, join = _p.join;
var traceur = require('traceur');

/**
 * Set the base directory for the test
 */
global.BASE_DIR = resolve(join(__dirname, '..'));
/**
 * Expose sinon globally.
 */
global.sinon = require('sinon');
/**
 * Expose chai's assertion interface globally.
 */
global.assert = require('chai').assert;

/**
 * Make all js files pass through traceur. The amount of time it took me to
 * figure out how to do this was ridiculous.
 */
traceur.require.makeDefault();
