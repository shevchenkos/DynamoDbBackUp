'use strict';

const DbRecord = require('./bin/dbRecord');
const DbStreamData = require('./bin/dbStreamData');
const DbInstanceData = require('./bin/dbInstanceData');


class Backup {
    constructor(config) {
        this.dbRecord = new DbRecord(config);
        this.dbStreamData = new DbStreamData(config);
        this.dbInstanceData = new DbInstanceData(config, this.dbRecord);
    }

    fromDbStream(records) {
        let allRecords = records.reduce((allRecords, action) => {
            let id = JSON.stringify(action.dynamodb.Keys);
            allRecords[id] = allRecords[id] || [];
            let change = {
                keys: id,
                data: JSON.stringify(action.dynamodb.NewImage),
                event: action.eventName
            };
            allRecords[id].push(change);
            
            return allRecords;
        }, {});
        let promises = [];
        Object.keys(allRecords).forEach(key => {
            promises.push(this.dbRecord.backup(allRecords[key], true));
        });
        return Promise.all(promises)
            .catch(err => {
                throw err;
            });
    }

    fromDbInstance(records) {
        let promises = [];
        records.forEach(record => {
            promises.push(this.dbRecord.backup([record]));
        });
        return Promise.all(promises)
            .catch(err => {
                throw err;
            });
    }

    incremental() {
        return this.dbStreamData.retrieve()
            .then(records => {
                this.fromDbStream(records);
            })
            .catch(err => {
                throw err;
            });
    }

    full() {
        return this.dbInstanceData.retrieve()
            .catch(err => {
                throw err;
            });
    }
}

module.exports = Backup;
