'use strict';

const AWS = require('aws-sdk');
const HttpsProxyAgent = require('proxy-agent');
// Use HTTPS Proxy (Optional)
const proxy = process.env.proxy
  || process.env.HTTP_PROXY
  || process.env.http_proxy
  || process.env.HTTPS_PROXY
  || process.env.https_proxy

if (proxy) {
  AWS.config.update({
    httpOptions: {
      agent: HttpsProxyAgent(proxy)
    }
  });
}

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
        console.time('Check if Bucket Exists');
        return new Promise(resolve => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket
            };
            s3.headBucket(params, err => {
                console.timeEnd('Check if Bucket Exists');
                if (err) {
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    }


    createBucket() {
        console.time('Create Bucket');
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket
            };
            s3.createBucket(params, err => {
                console.timeEnd('Create Bucket');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    getVersioningStatus() {
        console.time('Get Bucket Versioning Status');
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket
            };
            s3.getBucketVersioning(params, (err, data) => {
                console.timeEnd('Get Bucket Versioning Status');
                if (err) {
                    return reject(err);
                }
                return resolve(data.Status);
            });
        });
    }

    enableVersioning() {
        console.time('Enable Bucket Versioning');
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket,
                VersioningConfiguration: {
                    Status: 'Enabled'
                }
            };
            s3.putBucketVersioning(params, (err, data) => {
                console.timeEnd('Enable Bucket Versioning');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateBucketACL() {
        console.time('Update Bucket ACL');
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: 'v4' });
            let params = {
                Bucket: this.S3Bucket,
                ACL: 'public-read-write'
            };
            s3.putBucketAcl(params, err => {
                console.timeEnd('Update Bucket ACL');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateBucketCORS() {
        console.time('Update Bucket CORS');
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
                console.timeEnd('Update Bucket CORS');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateBucketPolicy() {
        console.time('Update Bucket Policy');
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
                console.timeEnd('Update Bucket Policy');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}

module.exports = S3Infrastructure;
