const assert = require('assert'),
    ActiveConnectionStore = require('../../lib/activeConnections'),
    fixtures = require('../fixtures');

let activeConnectionStore;

describe('activeConnections data store', function() {
    beforeEach(done => {
        activeConnectionStore = new ActiveConnectionStore();

        let options = {
            cosmosDbEndpoint: process.env.ACTIVE_CONNECTIONS_COSMOSDB_ENDPOINT,
            cosmosDbKey: process.env.ACTIVE_CONNECTIONS_COSMOSDB_KEY,
            databaseName: process.env.ACTIVE_CONNECTIONS_DATABASE_NAME,
            collectionName: process.env.ACTIVE_CONNECTIONS_COLLECTION_NAME
        };

        activeConnectionStore.init(options, err => {
            assert(!err);

            activeConnectionStore.delete(
                [
                    fixtures.deleteableConnection.clientId,
                    fixtures.existingConnection.clientId,
                    fixtures.expiredConnection.clientId,
                    fixtures.newConnection.clientId
                ],
                done
            );
        });
    });

    it('can create a database', done => {
        activeConnectionStore.createDatabase(err => {
            assert(!err);

            done();
        });
    });

    it('can create a collection', done => {
        activeConnectionStore.createCollection(err => {
            assert(!err);

            done();
        });
    });

    it('can insert and get by client id a connection', done => {
        activeConnectionStore.upsert(fixtures.newConnection, err => {
            assert(!err);

            activeConnectionStore.getByClientId(
                fixtures.newConnection.clientId,
                (err, connections) => {
                    assert(!err);
                    assert.equal(connections.length, 1);
                    assert.equal(
                        connections[0].clientId,
                        fixtures.newConnection.clientId
                    );
                    done();
                }
            );
        });
    });

    it('can get all connections by server id', done => {
        activeConnectionStore.upsert(fixtures.newConnection, err => {
            assert(!err);

            activeConnectionStore.getByServerId(
                fixtures.newConnection.serverId,
                (err, connections) => {
                    assert(!err);

                    assert.equal(connections.length, 1);
                    assert.equal(
                        connections[0].clientId,
                        fixtures.newConnection.clientId
                    );
                    done();
                }
            );
        });
    });

    it('can delete a connection', done => {
        activeConnectionStore.upsert(fixtures.deleteableConnection, err => {
            assert(!err);

            activeConnectionStore.delete(
                [fixtures.deleteableConnection.clientId],
                err => {
                    assert(!err);

                    activeConnectionStore.getByClientId(
                        fixtures.deleteableConnection.clientId,
                        (err, connections) => {
                            assert(!err);
                            assert.equal(connections.length, 0);

                            done();
                        }
                    );
                }
            );
        });
    });

    it('can aggregate connections by serverId', done => {
        activeConnectionStore.upsert(fixtures.existingConnection, err => {
            assert(!err);
            activeConnectionStore.upsert(fixtures.newConnection, err => {
                assert(!err);

                activeConnectionStore.getCountByServerId(
                    (err, aggregatedConnections) => {
                        assert(!err);

                        done();
                    }
                );
            });
        });
    });

    it('can delete expired client connections', done => {
        activeConnectionStore.upsert(fixtures.newConnection, err => {
            assert(!err);

            activeConnectionStore.upsert(fixtures.expiredConnection, err => {
                assert(!err);

                activeConnectionStore.deleteExpiredClients(err => {
                    assert(!err);

                    activeConnectionStore.getCountByServerId(
                        (err, aggregatedConnections) => {
                            assert(!err);

                            assert.equal(aggregatedConnections.length, 1);
                            assert.equal(
                                aggregatedConnections[0].serverId,
                                '5df6d152-5455-11e8-9803-b176fa0f80d8'
                            );
                            assert.equal(aggregatedConnections[0].count, 1);

                            done();
                        }
                    );
                });
            });
        });
    });
});
