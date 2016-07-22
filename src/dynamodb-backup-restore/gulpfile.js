'use strict';

const Config = require('./config.json');
const gulp = require('gulp');
const restore = require('./core/index');
const Backup = require('./backup');

gulp.task('restore', (cb) => {
    restore()
        .then(() => {
            cb(null);
        })
        .catch(err => {
            cb(err);
        });
});

gulp.task('backup', (cb) => {
    let config = {
        S3Bucket: Config.S3.bucket,
        S3Prefix: Config.S3.prefix,
        S3Region: Config.S3.region,
        DbTable: Config.Db.table,
        DbRegion: Config.Db.region,
    };

    let backup = new Backup(config);
    backup.incremental()
        .then((r) => {
            cb(null, r);
        })
        .catch(err => {
            cb(err);
        });
});
