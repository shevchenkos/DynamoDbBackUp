'use strict';

const config = require('./config');
const Backup = require('dynamodb-backup-restore').Backup;

module.exports.handler = (event, context, callback) => {
    if (!event.Records) {
        callback('There are no items to process.');
    }
    else {
        let backup = new Backup(config);
        backup.fromDbStream(event.Records).then(() => {
            callback();
        }).catch(err => {
            callback(err);
        });
    }
}
