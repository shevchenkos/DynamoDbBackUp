'use strict';

const AWS = require('aws-sdk');

class S3Infrastructure {
    constructor(config) {
        this.S3Bucket = config.S3Bucket;
        this.S3Region = config.S3Region;
    }

    createAndConfigure() {
        return this.isBucketExists()
            .then(exists => {
                if (exists) {
                    return;
                }
                else {
                    return this.createBucket()
                }
            })
            .then(() => {
                return this.getVersioningStatus();
            })
            .then(status => {
                if (status === 'Enabled') {
                    return;
                }
                return this.enableVersioning();
            })
            .then(() => {
                return this.updateBucketACL();
            })
            .then(() => {
                return this.updateBucketCORS();
            })
            .then(() => {
                return this.updateBucketPolicy();
            })
            .catch(err => {
                throw err;
            });
    }

    isBucketExists() {
        return new Promise(resolve => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket
            };
            s3.headBucket(params, err => {
                if (err) {
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    }


    createBucket() {
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket
            };
            s3.createBucket(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    getVersioningStatus() {
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket
            };
            s3.getBucketVersioning(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data.Status);
            });
        });
    }

    enableVersioning() {
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket,
                VersioningConfiguration: {
                    Status: 'Enabled'
                }
            };
            s3.putBucketVersioning(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateBucketACL() {
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket,
                ACL: 'public-read-write'
            };
            s3.putBucketAcl(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateBucketCORS() {
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket,
                CORSConfiguration: {
                    CORSRules: [
                        {
                            AllowedMethods: ['GET'],
                            AllowedOrigins: ['*'],
                            AllowedHeaders: ['*'],
                            MaxAgeSeconds: 3000
                        }
                    ]
                }
            };
            s3.putBucketCors(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateBucketPolicy() {
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "*",
                        "Effect": "Deny",
                        "Principal": "*",
                        "Action": [
                            "s3:PutObject"
                        ],
                        "Resource": ["arn:aws:s3:::" + this.S3Bucket + "/*"],
                        "Condition": {
                            "StringNotEquals": {
                                "s3:x-amz-server-side-encryption": "AES256"
                            }
                        }
                    }
                ]
            };
            let params = {
                Bucket: this.S3Bucket,
                Policy: JSON.stringify(policy, null, 2)
            };
            s3.putBucketPolicy(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}

module.exports = S3Infrastructure;
