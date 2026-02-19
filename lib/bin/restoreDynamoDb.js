'use strict';

const AWS = require('aws-sdk');
const { retryAwsCall } = require('./retry');

class RestoreDynamoDb {
    constructor(config) {
        this.S3Bucket = config.S3Bucket;
        this.S3Region = config.S3Region;
        this.DbTable = config.DbTable;
        this.DbRegion = config.DbRegion;
    }

    s3ToDynamoDb(versionList) {
        return this.getDbTableKeys()
            .then(keys => {
                let promises = [];
                Object.keys(versionList).forEach((key, index) => {
                    promises.push(this.processVersion(versionList[key], keys));
                });

                return Promise.all(promises);
            })
            .catch(err => {
                throw err;
            });
    }

    getDbTableKeys() {
        let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
        return retryAwsCall(dynamoDb.describeTable.bind(dynamoDb), { TableName: this.DbTable }, {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000
        }).then(data => {
            return data.Table.KeySchema;
        });
    }

    processVersion(version, keys) {
        return this.retrieveFromS3(version)
            .then(data => {
                return this.pushToDynamoDb(data, keys);
            })
            .catch(err => {
                throw err;
            });
    }

    retrieveFromS3(version) {
        let params = { Bucket: this.S3Bucket, Key: version.Key, VersionId: version.VersionId };
        let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: "v4" });
        console.time('RFS3 ' + version.Key);
        return retryAwsCall(s3.getObject.bind(s3), params, {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000
        }).then(data => {
            console.timeEnd('RFS3 ' + version.Key);
            return [version, JSON.parse(data.Body.toString('utf-8'))];
        }).catch(err => {
            console.timeEnd('RFS3 ' + version.Key);
            throw new Error('Failed to retrieve file from S3 - Params: ' + JSON.stringify(params) + ' - ' + err.message);
        });
    }

    pushToDynamoDb(data, keys) {
        return new Promise((resolve, reject) => {
            let version = data[0];
            let fileContents = data[1];
            let action = {};
            let dParams = { RequestItems: {} };
            dParams.RequestItems[this.DbTable] = [];

            if (!version.DeletedMarker) {
                Object.keys(fileContents).forEach(attributeName => {
                    // Fix JSON.stringified Binary data
                    let attr = fileContents[attributeName];
                    if (attr.B && attr.B.type && (attr.B.type === 'Buffer') && attr.B.data) {
                        attr.B = Buffer.from(attr.B.data);
                    }
                });
                action.PutRequest = {
                    Item: fileContents
                };
            } else {
                action.DeleteRequest = {
                    Key: {}
                };
                keys.forEach(key => {
                    action.DeleteRequest.Key[key.AttributeName] = fileContents[key.AttributeName];
                });
            }
            dParams.RequestItems[this.DbTable].push(action);

            let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
            console.time('P2D ' + version.Key);
            retryAwsCall(dynamoDb.batchWriteItem.bind(dynamoDb), dParams, {
                maxRetries: 3,
                initialDelay: 1000,
                maxDelay: 10000
            }).then(data => {
                console.timeEnd('P2D ' + version.Key);
                resolve(data);
            }).catch(err => {
                console.timeEnd('P2D ' + version.Key);
                reject(err);
            });
        });
    }
}

module.exports = RestoreDynamoDb;
