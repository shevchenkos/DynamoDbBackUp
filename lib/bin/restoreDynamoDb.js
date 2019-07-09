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
        return new Promise((resolve, reject) => {
            let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
            dynamoDb.describeTable({ TableName: this.DbTable }, (err, data) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data.Table.KeySchema);
            });
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
        return new Promise((resolve, reject) => {
            console.time('RFS3 ' + version.Key);
            s3.getObject(params, (err, data) => {
                console.timeEnd('RFS3 ' + version.Key);
                if (err) {
                    return reject('Failed to retrieve file from S3 - Params: ' + JSON.stringify(params));
                }

                return resolve([version, JSON.parse(data.Body.toString('utf-8'))]);
            });
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
            dynamoDb.batchWriteItem(dParams, (err, data) => {
                console.timeEnd('P2D ' + version.Key);
                if (err) {
                    return reject(err);
                }

                return resolve(data);
            });
        });
    }
}

module.exports = RestoreDynamoDb;
