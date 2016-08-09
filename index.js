'use strict';

const Restore = require('./lib/restore');
const Backup = require('./lib/backup');
const Deploy = require('./lib/deploy');

module.exports = {
    Backup: Backup,
    Restore: Restore,
    Deploy: Deploy
};
