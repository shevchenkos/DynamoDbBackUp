'use strict';

const {
    validateBackupConfig,
    validateRestoreConfig,
    validateDeployConfig,
    isValidRegion,
    isValidBucketName,
    isValidTableName
} = require('./../lib/bin/validation');

describe('Validation', function () {
    describe('isValidRegion', function () {
        it('should validate correct AWS regions', function () {
            expect(isValidRegion('us-east-1')).toBe(true);
            expect(isValidRegion('eu-west-1')).toBe(true);
            expect(isValidRegion('ap-southeast-2')).toBe(true);
        });

        it('should reject invalid regions', function () {
            expect(isValidRegion('invalid')).toBe(false);
            expect(isValidRegion('us_east_1')).toBe(false);
            expect(isValidRegion('')).toBe(false);
            expect(isValidRegion(null)).toBe(false);
            expect(isValidRegion(undefined)).toBe(false);
        });
    });

    describe('isValidBucketName', function () {
        it('should validate correct S3 bucket names', function () {
            expect(isValidBucketName('valid-bucket-name')).toBe(true);
            expect(isValidBucketName('bucket123')).toBe(true);
            expect(isValidBucketName('my.bucket.name')).toBe(true);
        });

        it('should reject invalid bucket names', function () {
            expect(isValidBucketName('InvalidBucket')).toBe(false);
            expect(isValidBucketName('bucket name with spaces')).toBe(false);
            expect(isValidBucketName('ab')).toBe(false); // too short
            expect(isValidBucketName('')).toBe(false);
            expect(isValidBucketName(null)).toBe(false);
        });
    });

    describe('isValidTableName', function () {
        it('should validate correct DynamoDB table names', function () {
            expect(isValidTableName('valid-table-name')).toBe(true);
            expect(isValidTableName('Table123')).toBe(true);
            expect(isValidTableName('table_name')).toBe(true);
            expect(isValidTableName('table.name')).toBe(true);
        });

        it('should reject invalid table names', function () {
            expect(isValidTableName('table name with spaces')).toBe(false);
            expect(isValidTableName('')).toBe(false);
            expect(isValidTableName(null)).toBe(false);
        });
    });

    describe('validateBackupConfig', function () {
        it('should validate correct backup config', function () {
            const config = {
                S3Bucket: 'valid-bucket',
                S3Region: 'us-east-1',
                DbTable: 'valid-table',
                DbRegion: 'us-east-1'
            };
            const result = validateBackupConfig(config, ['S3Bucket', 'S3Region', 'DbTable', 'DbRegion']);
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should reject config with missing required fields', function () {
            const config = {
                S3Bucket: 'valid-bucket',
                S3Region: 'us-east-1'
            };
            const result = validateBackupConfig(config, ['S3Bucket', 'S3Region', 'DbTable', 'DbRegion']);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should reject config with invalid S3Encryption', function () {
            const config = {
                S3Bucket: 'valid-bucket',
                S3Region: 'us-east-1',
                DbTable: 'valid-table',
                DbRegion: 'us-east-1',
                S3Encryption: 'invalid-encryption'
            };
            const result = validateBackupConfig(config, ['S3Bucket', 'S3Region', 'DbTable', 'DbRegion']);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('S3Encryption'))).toBe(true);
        });
    });

    describe('validateRestoreConfig', function () {
        it('should validate correct restore config', function () {
            const config = {
                S3Bucket: 'valid-bucket',
                S3Region: 'us-east-1',
                DbTable: 'valid-table',
                DbRegion: 'us-east-1'
            };
            const result = validateRestoreConfig(config);
            expect(result.valid).toBe(true);
        });
    });

    describe('validateDeployConfig', function () {
        it('should validate correct S3 deploy config', function () {
            const config = {
                S3Bucket: 'valid-bucket',
                S3Region: 'us-east-1'
            };
            const result = validateDeployConfig(config, 's3');
            expect(result.valid).toBe(true);
        });

        it('should validate correct Lambda deploy config', function () {
            const config = {
                S3Bucket: 'valid-bucket',
                S3Region: 'us-east-1',
                DbRegion: 'us-east-1',
                LambdaName: 'test-lambda',
                LambdaRegion: 'us-east-1',
                LambdaAlias: 'prod',
                LambdaRoleName: 'test-role'
            };
            const result = validateDeployConfig(config, 'lambda');
            expect(result.valid).toBe(true);
        });

        it('should validate correct Lambda event config', function () {
            const config = {
                DbTable: 'valid-table',
                DbRegion: 'us-east-1',
                LambdaName: 'test-lambda',
                LambdaRegion: 'us-east-1',
                LambdaAlias: 'prod'
            };
            const result = validateDeployConfig(config, 'lambdaEvent');
            expect(result.valid).toBe(true);
        });
    });
});

