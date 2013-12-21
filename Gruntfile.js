module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // !jshint all code
    jshint: {
      options: {
        jshintrc: true
      },
      all: ['Gruntfile.js', 'src/*.js', 'test/*.js']
    },
    // Mocha tests
    mochaTest: {
      options: {
        reporter: 'list',
        require: ['test/init'],
        mocha: require('mocha')
      },
      test: ['test/*.spec.js']
    },
    // Production-ready uglified build
    uglify: {
      options: {
        banner: '/**\n' +
                 '* smatch - A scala-style pattern matching utility for ' +
                 'javascript.\n' +
                 '* @author Travis Kaufman <travis.kaufman@gmail.com>\n' +
                 '* @copyright 2013 Travis Kaufman\n' +
                 '* @license MIT\n' +
                 '* @version <%= pkg.version %>\n' +
                 '*/\n'
      },
      files: {
        'dist/smatch.min.js': ['lib/smatch.js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.registerTask('build', ['jshint', 'mochaTest', 'uglify']);
};
