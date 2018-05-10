const async = require('async'),
    DocumentClient = require('documentdb').DocumentClient,
    HttpStatusCodes = require('http-status-codes');

const DEFAULT_COLLECTION_NAME = 'activeConnections',
    DEFAULT_DATABASE_NAME = '3dtoolkit',
    DEFAULT_COLLECTION_RU = 1000,
    DEFAULT_CLIENT_CONNECTION_EXPIRATION_MILLIS = 10000;

function checkOptionExists(options, optionName, callback) {
    if (!options[optionName]) {
        return callback(new Error(`${optionName} option not provided.`));
    }
}

class ActiveConnectionsStore {
    createDatabase(callback) {
        this.cosmosDbClient.readDatabase(this.databaseUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOT_FOUND) {
                    this.cosmosDbClient.createDatabase(
                        { id: this.databaseName },
                        (err, created) => {
                            return callback(err);
                        }
                    );
                } else {
                    return callback(err);
                }
            } else {
                return callback();
            }
        });
    }

    createCollection(callback) {
        this.cosmosDbClient.readCollection(
            this.collectionUrl,
            (err, result) => {
                if (err) {
                    if (err.code == HttpStatusCodes.NOT_FOUND) {
                        this.cosmosDbClient.createCollection(
                            this.databaseUrl,
                            { id: this.collectionName },
                            {
                                offerThroughput: this.collectionRUs
                            },
                            (err, created) => {
                                return callback(err);
                            }
                        );
                    } else {
                        return callback(err);
                    }
                } else {
                    return callback();
                }
            }
        );
    }

    init(options, callback) {
        checkOptionExists(options, 'cosmosDbEndpoint', callback);
        checkOptionExists(options, 'cosmosDbKey', callback);

        this.databaseName = options.databaseName || DEFAULT_DATABASE_NAME;
        this.collectionName = options.collectionName || DEFAULT_COLLECTION_NAME;
        this.collectionRUs = options.collectionRUs || DEFAULT_COLLECTION_RU;
        this.clientConnectionExpirationMillis =
            options.clientConnectionExpirationMillis ||
            DEFAULT_CLIENT_CONNECTION_EXPIRATION_MILLIS;

        this.cosmosDbClient = new DocumentClient(options.cosmosDbEndpoint, {
            masterKey: options.cosmosDbKey
        });

        this.databaseUrl = `dbs/${this.databaseName}`;
        this.collectionUrl = `${this.databaseUrl}/colls/${this.collectionName}`;

        return callback();
    }

    getAll(callback) {
        let query = `SELECT * FROM ${this.collectionName} a`;

        this.cosmosDbClient
            .queryDocuments(this.collectionUrl, query)
            .toArray(callback);
    }

    getCountByServerId(callback) {
        let countByServerId = {};
        this.getAll((err, connections) => {
            if (err) return callback(err);

            connections.forEach(connection => {
                if (!countByServerId[connection.serverId])
                    countByServerId[connection.serverId] = 0;
                countByServerId[connection.serverId] += 1;
            });

            let resultRows = [];
            Object.keys(countByServerId).forEach(key => {
                let result = {
                    serverId: key,
                    count: countByServerId[key]
                };

                resultRows.push(result);
            });

            return callback(null, resultRows);
        });
    }

    getByClientId(clientId, callback) {
        let query = `SELECT * FROM ${
            this.collectionName
        } a WHERE a.clientId = "${clientId}"`;

        this.cosmosDbClient
            .queryDocuments(this.collectionUrl, query)
            .toArray(callback);
    }

    getExpiredClients(callback) {
        let expirationTimestamp =
            Date.now() - this.clientConnectionExpirationMillis;

        this.getAll((err, connections) => {
            let expiredConnections = connections.filter(connection => {
                return (
                    Date.parse(connection.clientLastSeen) < expirationTimestamp
                );
            });

            return callback(null, expiredConnections);
        });
    }

    getByServerId(serverId, callback) {
        let query = `SELECT * FROM ${
            this.collectionName
        } a WHERE a.serverId = "${serverId}"`;

        this.cosmosDbClient
            .queryDocuments(this.collectionUrl, query)
            .toArray(callback);
    }

    delete(clientIds, callback) {
        async.each(
            clientIds,
            (clientId, clientIdCallback) => {
                let documentUrl = `${this.collectionUrl}/docs/${clientId}`;
                this.cosmosDbClient.deleteDocument(documentUrl, err => {
                    if (err && err.code !== HttpStatusCodes.NOT_FOUND) {
                        return clientIdCallback(err);
                    }

                    return clientIdCallback();
                });
            },
            callback
        );
    }

    deleteExpiredClients(callback) {
        this.getExpiredClients((err, connections) => {
            if (err) return callback(err);
            if (connections.length === 0) return callback();

            let clientIds = connections.map(connection => {
                return connection.clientId;
            });

            return this.delete(clientIds, callback);
        });
    }

    upsert(connection, callback) {
        connection.id = connection.clientId;
        let documentUrl = `${this.collectionUrl}/docs/${connection.id}`;

        this.cosmosDbClient.replaceDocument(documentUrl, connection, err => {
            if (!err || (err && err.code !== HttpStatusCodes.NOT_FOUND))
                return callback(err);

            this.cosmosDbClient.createDocument(
                this.collectionUrl,
                connection,
                callback
            );
        });
    }
}

module.exports = ActiveConnectionsStore;
