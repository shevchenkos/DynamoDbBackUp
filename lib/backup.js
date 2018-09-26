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
        const addDataForEvents = ['INSERT', 'MODIFY'];
        return records.reduce((allRecords, action) => allRecords.then(allRecords => {
            let id = JSON.stringify(action.dynamodb.Keys);
            allRecords[id] = allRecords[id] || [];
            let pdata = Promise.resolve({});
            if (action.dynamodb.NewImage) {
                pdata = Promise.resolve(action.dynamodb.NewImage);
            } else if (addDataForEvents.includes(action.eventName)) {
                try {
                    pdata = this.dbInstanceData.getItem(action.dynamodb.Keys);
                } catch (e) {
                    return allRecords;
                }
            }
            return pdata.then(data => {
                let change = {
                    keys: id,
                    data: JSON.stringify(data),
                    event: action.eventName
                };
                allRecords[id].push(change);
                
                return allRecords;
            });
        }), Promise.resolve({}))
            .then(allRecords => Promise.all(Object.keys(allRecords).map(key => this.dbRecord.backup(allRecords[key], true))))
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
