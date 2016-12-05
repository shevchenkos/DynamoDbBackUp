'use strict';

const VersionList = require('./../../lib/bin/versionList');
let versionReaderFunc = () => {
    return new Promise((resolve, reject) => { resolve([createVersion(new Date().getTime() - 1), createVersion(new Date().getTime() + 1)]) });
}

let createVersion = (date) => {
    return {
        LastModified: date,
        Key: date.toString()
    };
};

let baseTime = new Date(2016, 1, 1);
jasmine.clock().mockDate(baseTime);

describe('Filtering no versions', function () {
    
    let versionList = new VersionList({}, versionReaderFunc);

    it('should return all entries without deletions', function (done) {
        versionList.getVersions()
            .then(versions => {
                expect(Object.keys(versions).length).toBe(2);
                expect(versions.filter(v => v.DeletedMarker === false).length).toBe(2);
                done();
            })
            .catch(err => {
                console.log(err);
                done(err);
            })
    });
});

describe('Filtering versions', function () {
    
    let versionList = new VersionList({ RestoreTime: new Date().getTime() }, versionReaderFunc);
    
    it('should not mark past entries as deleted', function (done) {
        versionList.getVersions()
            .then(versions => {
                expect(versions[new Date().getTime() - 1].DeletedMarker).toBe(undefined);
                done();
            })
            .catch(err => {
                console.log(err);
                done(err);
            })
    });
    
    it('should mark future entries as deleted', function (done) {
        versionList.getVersions()
            .then(versions => {
                expect(versions[new Date().getTime() + 1].DeletedMarker).toBe(true);
                done();
            })
            .catch(err => {
                console.log(err);
                done(err);
            })
    });
});
