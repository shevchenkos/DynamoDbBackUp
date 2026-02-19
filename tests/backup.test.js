'use strict';

const Backup = require('./../lib/backup');

describe('Backup', function () {
    describe('constructor', function () {
        it('should throw error for missing required fields', function () {
            expect(function () {
                new Backup({});
            }).toThrow();
        });

        it('should throw error for invalid S3Bucket name', function () {
            expect(function () {
                new Backup({
                    S3Bucket: 'invalid bucket name!',
                    S3Region: 'us-east-1',
                    DbTable: 'test-table',
                    DbRegion: 'us-east-1'
                });
            }).toThrow();
        });

        it('should throw error for invalid region format', function () {
            expect(function () {
                new Backup({
                    S3Bucket: 'valid-bucket-name',
                    S3Region: 'invalid-region',
                    DbTable: 'test-table',
                    DbRegion: 'us-east-1'
                });
            }).toThrow();
        });

        it('should throw error for invalid table name', function () {
            expect(function () {
                new Backup({
                    S3Bucket: 'valid-bucket-name',
                    S3Region: 'us-east-1',
                    DbTable: 'invalid table name!',
                    DbRegion: 'us-east-1'
                });
            }).toThrow();
        });

        it('should accept valid configuration', function () {
            expect(function () {
                new Backup({
                    S3Bucket: 'valid-bucket-name',
                    S3Region: 'us-east-1',
                    DbTable: 'valid-table-name',
                    DbRegion: 'us-east-1'
                });
            }).not.toThrow();
        });

        it('should accept optional S3Prefix', function () {
            expect(function () {
                new Backup({
                    S3Bucket: 'valid-bucket-name',
                    S3Region: 'us-east-1',
                    DbTable: 'valid-table-name',
                    DbRegion: 'us-east-1',
                    S3Prefix: 'backups'
                });
            }).not.toThrow();
        });

        it('should accept valid S3Encryption', function () {
            expect(function () {
                new Backup({
                    S3Bucket: 'valid-bucket-name',
                    S3Region: 'us-east-1',
                    DbTable: 'valid-table-name',
                    DbRegion: 'us-east-1',
                    S3Encryption: 'aws:kms'
                });
            }).not.toThrow();
        });
    });
});
