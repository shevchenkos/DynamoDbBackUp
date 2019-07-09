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

class DynamoInfrastructure {
    constructor(config) {
        this.DbTable = config.DbTable;
        this.DbRegion = config.DbRegion
    }

    getStreamArn() {
        return this.getStreamSettings()
            .then(settings => {
                if (settings.enabled) {
                    return settings.streamArn;
                }
                else {
                    return this.enableStream();
                }
            })
            .catch(err => {
                throw err;
            });
    }

    getStreamSettings() {
        console.time('Get Table Stream');
        return new Promise((resolve, reject) => {
            let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
            let params = {
                TableName: this.DbTable
            };
            dynamoDb.describeTable(params, (err, data) => {
                console.timeEnd('Get Table Stream');
                if (err) {
                    return reject(err);
                }
                if (data.Table.StreamSpecification) {
                    let streamSettings = {
                        enabled: data.Table.StreamSpecification.StreamEnabled,
                        streamArn: data.Table.LatestStreamArn
                    };
                    return resolve(streamSettings);
                }
                else {
                    return resolve({ enabled: false });
                }
            });
        });
    }

    enableStream() {
        console.time('Enable Table Stream');
        return new Promise((resolve, reject) => {
            let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
            let params = {
                TableName: this.DbTable,
                StreamSpecification: {
                    StreamEnabled: true,
                    StreamViewType: 'NEW_AND_OLD_IMAGES'
                }
            };
            dynamoDb.updateTable(params, (err, data) => {
                console.timeEnd('Enable Table Stream');
                if (err) {
                    return reject(err);
                }
                return resolve(data.TableDescription.LatestStreamArn);
            });
        });
    }
}

module.exports = DynamoInfrastructure;
