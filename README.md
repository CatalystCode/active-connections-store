# active-connections-store

A shared module used by both the [signalling](https://github.com/bengreenier/3dtoolkit-signal) and orchestration services of the [3dtoolkit](https://github.com/CatalystCode/3dtoolkit) to managed the shared state around active webrtc connections.

## Installation

```
$ npm install --save active-connections-store
```

## Initialization

The module exposes a class, ActiveConnectionsStore. Instances of this class requires initialization to setup the database client via the init method with the options below. Only cosmosDbEndpoint and cosmosDbKey are required, the others, if not provided, will default to the values below.

```
let activeConnectionStore = new ActiveConnectionStore();

let options = {
    cosmosDbEndpoint: <CosmosDB endpoint>,
    cosmosDbKey: <CosmosDB key>,
    databaseName: <Database Name>, // defaults to '3dtoolkit'
    collectionName: <Collection Name>, // defaults to 'activeConnections'
    collectionRUs: <# of request units to provision for collection> // defaults to 1000
    clientConnectionExpirationMillis: <the number of milliseconds before a client connnection expires> // defaults to 10000
};

activeConnectionStore.init(options, err => {

    // ... perform actions on activeConnectionStore per below

});
```

## activeConnectionStore.upsert(connection, callback)

You can upsert connections into the store via 'upsert'. If a connection exists it will be updated, otherwise it will be inserted.

```
activeConnectionStore.upsert(connection, err => {
    // connection has been upserted.
});
```

## activeConnectionStore.deleteExpiredClients(callback)

Deletes expired client connections from the store.

activeConnectionStore.deleteExpiredClients(err => {
// expired connections have been deleted.
}

## getCountByServerId(callback)

Gets an aggregated count by server id of the number of connections to that server.

getCountByServerId((err, aggregatedCounts => {
// aggregatedCounts is an array of { serverId, count } with the aggregated connected clients of serverId.
})

More usage examples can be found in the unit tests.
