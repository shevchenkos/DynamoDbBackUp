'use strict';

const gulp = require('gulp');
const argv = require('yargs').argv;
const restore = require('./restore');
const Backup = require('./backup');

gulp.task('restore', (cb) => {
    let config = {
        S3Bucket: argv.s3bucket,
        S3Prefix: argv.s3prefix,
        S3Region: argv.s3region,
        DbTable: argv.dbtable,
        DbRegion: argv.dbregion,
        RestoreTime: argv.restoretime || new Date()
    };

    restore(config)
        .then(() => {
            cb(null);
        })
        .catch(err => {
            cb(err);
        });
});

gulp.task('backup-incremental', (cb) => {
    let config = {
        S3Bucket: argv.s3bucket,
        S3Prefix: argv.s3prefix,
        S3Region: argv.s3region,
        DbTable: argv.dbtable,
        DbRegion: argv.dbregion
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

gulp.task('backup-full', (cb) => {
    let config = {
        S3Bucket: argv.s3bucket,
        S3Prefix: argv.s3prefix,
        S3Region: argv.s3region,
        DbTable: argv.dbtable,
        DbRegion: argv.dbregion
    };

    let backup = new Backup(config);
    backup.full()
        .then((r) => {
            cb(null, r);
        })
        .catch(err => {
            cb(err);
        });
});
