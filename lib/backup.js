'use strict';

const DbRecord = require('./bin/dbRecord');
const DbStreamData = require('./bin/dbStreamData');
const DbInstanceData = require('./bin/dbInstanceData');
const { validateBackupConfig } = require('./bin/validation');

/**
 * Backup class for DynamoDB table backups to S3
 * Supports full and incremental backups via DynamoDB Streams
 */
class Backup {
    /**
     * Creates a new Backup instance
     * @param {object} config - Configuration object
     * @param {string} config.S3Bucket - S3 bucket name for backups
     * @param {string} config.S3Region - AWS region for S3 bucket
     * @param {string} config.DbTable - DynamoDB table name
     * @param {string} config.DbRegion - AWS region for DynamoDB table
     * @param {string} [config.S3Prefix] - Optional S3 prefix/folder for backups
     * @param {string} [config.S3Encryption] - Encryption type: 'AES256' (default) or 'aws:kms'
     * @throws {Error} If configuration is invalid
     */
    constructor(config) {
        const requiredFields = ['S3Bucket', 'S3Region', 'DbTable', 'DbRegion'];
        const validation = validateBackupConfig(config, requiredFields);
        if (!validation.valid) {
            throw new Error(`Invalid backup configuration: ${validation.errors.join(', ')}`);
        }

        this.dbRecord = new DbRecord(config);
        this.dbStreamData = new DbStreamData(config);
        this.dbInstanceData = new DbInstanceData(config, this.dbRecord);
    }

    /**
     * Processes DynamoDB Stream records and backs them up to S3
     * @param {Array} records - Array of DynamoDB Stream records
     * @returns {Promise} Promise that resolves when backup is complete
     */
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

    /**
     * Backs up records directly from DynamoDB table instance
     * @param {Array} records - Array of DynamoDB records to backup
     * @returns {Promise} Promise that resolves when backup is complete
     */
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

    /**
     * Performs an incremental backup by reading from DynamoDB Streams
     * @returns {Promise} Promise that resolves when incremental backup is complete
     */
    incremental() {
        return this.dbStreamData.retrieve()
            .then(records => {
                return this.fromDbStream(records);
            })
            .catch(err => {
                throw err;
            });
    }

    /**
     * Performs a full backup by scanning the entire DynamoDB table
     * @returns {Promise} Promise that resolves when full backup is complete
     */
    full() {
        return this.dbInstanceData.retrieve()
            .catch(err => {
                throw err;
            });
    }
}

module.exports = Backup;
