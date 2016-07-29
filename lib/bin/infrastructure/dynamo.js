'use strict';

const AWS = require('aws-sdk');

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
        return new Promise((resolve, reject) => {
            let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
            let params = {
                TableName: this.DbTable
            };
            dynamoDb.describeTable(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                console.log()
                let streamSettings = {
                    enabled: data.Table.StreamSpecification.StreamEnabled,
                    streamArn: data.Table.LatestStreamArn
                };
                return resolve(streamSettings);
            });
        });
    }

    enableStream() {
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
                if (err) {
                    return reject(err);
                }
                return resolve(data.Table.LatestStreamArn);
            });
        });
    }
}

module.exports = DynamoInfrastructure;
