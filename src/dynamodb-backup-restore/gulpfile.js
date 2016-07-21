const gulp = require('gulp');
const restore = require('./core/index');

gulp.task('restore', (cb) => {
    restore()
        .then(() => {
            cb(null);
        })
        .catch(err => {
            cb(err);
        });
});
