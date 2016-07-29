'use strict';

const Restore = require('./lib/restore');
const Backup = require('./lib/backup');

module.exports = {
    Backup: Backup,
    Restore: Restore
};
