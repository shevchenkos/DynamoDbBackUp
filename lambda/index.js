'use strict';

const config = require('./config');
const Backup = require('dynamodb-backup-restore').Backup;

module.exports.handler = (event, context, callback) => {
    if (!event.Records) {
        return callback(new Error('There are no items to process.'));
    }
    
    let backup = new Backup(config);
    backup.fromDbStream(event.Records).then(() => {
        callback(null);
    }).catch(err => {
        callback(err);
    });
}
