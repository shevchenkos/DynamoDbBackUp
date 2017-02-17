'use strict';

const gulp = require('gulp');
const argv = require('yargs').argv;
const jasmine = require('gulp-jasmine');
const Restore = require('./lib/restore');
const Backup = require('./lib/backup');
const Deploy = require('./lib/deploy');

gulp.task('restore', (cb) => {
    let config = {
        S3Bucket: argv.s3bucket,
        S3Prefix: argv.s3prefix,
        S3Region: argv.s3region,
        DbTable: argv.dbtable,
        DbRegion: argv.dbregion,
        RestoreTime: argv.restoretime || new Date()
    };

    Restore(config)
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

gulp.task('deploy-s3-bucket', (cb) => {
    let config = {
        S3Bucket: argv.s3bucket,
        S3Region: argv.s3region
    };

    let deploy = new Deploy(config);
    deploy.backupBucket()
        .then(() => {
            cb(null);
        })
        .catch(err => {
            cb(err);
        });
});

gulp.task('deploy-lambda', (cb) => {
    let config = {
        S3Bucket: argv.s3bucket,
        S3Prefix: argv.s3prefix,
        S3Region: argv.s3region,
        DbRegion: argv.dbregion,
        LambdaName: argv.lName,
        LambdaRegion: argv.lRegion,
        LambdaAlias: argv.lAlias,
        LambdaRoleName: argv.lRoleName,
        LambdaMemorySize: argv.lMemorySize || 128,
        LambdaTimeout: argv.lTimeout || 6
    };

    let deploy = new Deploy(config);
    deploy.lambda()
        .then(() => {
            cb(null);
        })
        .catch(err => {
            cb(err);
        });
});

gulp.task('deploy-lambda-event', (cb) => {
    let config = {
        DbTable: argv.dbtable,
        DbRegion: argv.dbregion,
        LambdaName: argv.lName,
        LambdaRegion: argv.lRegion,
        LambdaAlias: argv.lAlias
    };

    let deploy = new Deploy(config);
    deploy.lambdaEvent()
        .then(() => {
            cb(null);
        })
        .catch(err => {
            cb(err);
        });
});

let process = require('process');

gulp.task('unit-test', (cb) => {
    return gulp.src([
        './tests/**/*.test.js'
    ])
        .pipe(jasmine({
            timeout: 1000,
            verbose: true,
            integration: true,
            abortOnTestFailure: true
        }))
        .on('done', function (result) {
            if (result.failed) {
                process.abort();
            } else {
                cb(null);
            }
        })
        .on('error', function () {
            process.abort();
        });
});
