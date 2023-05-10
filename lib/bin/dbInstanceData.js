'use strict';

const AWS = require('aws-sdk');

class DbInstanceData {
    constructor(config, dbRecord) {
        this.DbTable = config.DbTable;
        this.DbRegion = config.DbRegion;
        this.dbRecord = dbRecord;
    }

    retrieve() {
        return this.getTableKeys()
            .then(keys => {
                return this.getRecords(keys)
                    .catch(err => {
                        throw err;
                    });
            })
            .catch(err => {
                throw err;
            });
    }

    getItem(Key) {
        let dynamodb = new AWS.DynamoDB({ region: this.DbRegion });
        let params = {
            Key,
            TableName: this.DbTable,
            ConsistentRead: true
        };
        return dynamodb.getItem(params).promise()
            .then(data => {
                if (data && data.Item) {
                    return data.Item;
                }
                return {}
            });
    }

    getTableKeys() {
        return new Promise((resolve, reject) => {
            let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
            dynamoDb.describeTable({ TableName: this.DbTable }, (err, data) => {
                if (err) {
                    return reject(err);
                }
                console.log('Got key schema ' + JSON.stringify(data.Table.KeySchema));
                return resolve(data.Table.KeySchema);
            });
        });
    }

    async getRecords(keys) {
        let dynamodb = new AWS.DynamoDB({ region: this.DbRegion });
        let params = {
          TableName: this.DbTable,
          ExclusiveStartKey: null,
          Limit: 100,
          Select: "ALL_ATTRIBUTES",
        };
    
        var numberOfRecords = 0;
    
        let LastEvaluatedKey = null;
        do {
          params.ExclusiveStartKey = LastEvaluatedKey;
          let data = await dynamodb.scan(params).promise();
    
          let records = [];
          data.Items.forEach((item) => {
            let id = {};
            keys.forEach((key) => {
              id[key.AttributeName] = item[key.AttributeName];
            });
    
            let record = {
              keys: JSON.stringify(id),
              data: JSON.stringify(item),
              event: "INSERT",
            };
            records.push(record);
          });
    
          let promises = [];
          records.forEach((record) => {
            promises.push(this.dbRecord.backup([record]));
          });
          await Promise.all(promises);
    
          numberOfRecords += data.Items.length;
          console.log(
            "Retrieved " +
              data.Items.length +
              " records; total at " +
              numberOfRecords +
              " records."
          );
          LastEvaluatedKey = data.LastEvaluatedKey;
        } while (LastEvaluatedKey);
    }
    

}

module.exports = DbInstanceData;
