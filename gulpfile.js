/*
 * Jexl
 * Copyright (c) 2017 Tom Shawver
 */

const gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    path = require('path'),
    coverageEnforcer = require("gulp-istanbul-enforcer"),
    istanbul = require('gulp-istanbul'),
    mocha = require('gulp-mocha');

gulp.task('dist', function () {
    return gulp.src('./lib/Jexl.js')
        .pipe(browserify({
            insertGlobals : true,
            debug : !gulp.env.production
        }))
        .pipe(uglify())
        .pipe(rename({
            basename: 'jexl',
            extname: '.min.js'
        }))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('coverage-test', function (cb) {
    var passThresholds = {
        thresholds: {
            statements: 95,
            branches: 88,
            lines: 95,
            functions: 92
        },
        coverageDirectory: 'coverage',
        rootDirectory: ''
    };
    gulp.src(['test/**/*.js'])
        .pipe(mocha())
        .on('end', function () {
            gulp.src(['lib/**/*.js'])
                .pipe(istanbul({includeUntested: true}))
                .pipe(istanbul.hookRequire())
                .on('finish', function () {
                    gulp.src(['test/**/*.js'])
                        .pipe(mocha({reporter: 'min'}))
                        .pipe(istanbul.writeReports({
                            reporters: ['json', 'lcovonly']
                        }))
                        .on('finish', function () {
                            gulp.src('.')
                                .pipe(coverageEnforcer(passThresholds))
                                .on('end', cb);
                        });
                });
        });
});

gulp.task('default', ['dist']);
