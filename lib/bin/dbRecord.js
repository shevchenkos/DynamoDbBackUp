'use strict';

const AWS = require('aws-sdk');
const crypto = require('crypto');
const { retryAwsCall } = require('./retry');

class DbRecord {
    constructor(config) {
        this.S3Bucket = config.S3Bucket;
        this.S3Region = config.S3Region;
        this.S3Prefix = config.S3Prefix;
        this.S3Encryption = config.S3Encryption || 'AES256';
    }

    backup(changes, sequential) {
        // sequential processing is required for Stream processing used by the incremental backups
        if (sequential) {
            return changes.reduce((p, change) => {
                return p.then(() => {
                    return this.backupChange(change);
                });
            }, Promise.resolve());
        } else {
            let promises = [];
            changes.forEach(change => {
                promises.push(this.backupChange(change));
            });
            return Promise.all(promises);
        }
    }

    backupChange(change) {
        let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: "v4" });

        let id = crypto.createHash('md5')
            .update(change.keys)
            .digest('hex');
        let key = [this.S3Prefix, id].join('/');

        let req = change.event === 'REMOVE' ? 'deleteObject' : 'putObject';

        let params = {
            Bucket: this.S3Bucket,
            Key: key
        };

        if (req === 'putObject') {
            params.Body = change.data;
            params.ServerSideEncryption = this.S3Encryption;
            params.StorageClass = 'STANDARD_IA';
            params.ContentType = "application/json";
            params.ACL = 'bucket-owner-full-control';
        }

        return retryAwsCall(s3[req].bind(s3), params, {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000
        }).catch(err => {
            console.log(
                '[error] %s | %s s3://%s/%s | %s',
                change.keys, req, params.Bucket, params.Key, err.message
            );
            throw err;
        });
    }
}

module.exports = DbRecord;
