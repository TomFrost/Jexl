/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var browserify = require('browserify'),
	gulp = require('gulp'),
	transform = require('vinyl-transform'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	path = require('path');

gulp.task('default', function () {
	// transform regular node stream to gulp (buffered vinyl) stream
	var browserified = transform(function(filename) {
		var b = browserify({
			paths: [path.dirname(filename)]
		});
		b.require(path.basename(filename, '.js'));
		return b.bundle();
	});
	return gulp.src('./lib/Jexl.js', {read: false})
		.pipe(browserified)
		.pipe(uglify())
		.pipe(rename({
			basename: 'jexl',
			extname: '.min.js'
		}))
		.pipe(gulp.dest('./dist/'));
});
