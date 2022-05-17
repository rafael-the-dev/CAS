//const config = require("config");
const { MongoClient } = require("mongodb");

const url = "mongodb+srv://rafael-the-dev:iH.-qJftk8g9cgc@cluster0.z64j5.mongodb.net/chatAPP?authMechanism=DEFAULT";//config.get("mongoDBConfig.url");
const dbName = "chapAPP";//config.get("mongoDBConfig.db");
const usersCollection = "users";//config.get("mongoDBConfig.collection");
const directMessagesCollection = "directMessages"
const groupMessagesCollection = "groupMessages"
const groupCollection = "group"

const dbConfig = { 
    //db: null,
    directMessagesDB: null,
    groupMessagesDB: null,
    groupsDB: null,
    isConnected: false ,
    usersDB: null
};

const mongoDBConnection = new MongoClient(url);

//let clusterCollection = null;

const createMongoDBConnection = async () => {
    let clusterDB;
    try {

        mongoDBConnection.on("connectionCreated", () => {
            dbConfig.isConnected = true;
            clusterDB = mongoDBConnection.db(dbName);
            //clusterCollection = clusterDB.collection(collectionName);
            //dbConfig.db = clusterCollection;//
            dbConfig.usersDB = clusterDB.collection(usersCollection)
            dbConfig.directMessagesDB = clusterDB.collection(directMessagesCollection)
            dbConfig.groupMessagesDB = clusterDB.collection(groupMessagesCollection)
            dbConfig.groupsDB = clusterDB.collection(groupCollection)
        });

        mongoDBConnection.on("close", () => {
            //dbConfig.db = null;
            dbConfig.isConnected = false;

            dbConfig.usersDB = null;
            dbConfig.directMessagesDB = null;
            dbConfig.groupMessagesDB = null;
            dbConfig.groupsDB = null;
        });

        await mongoDBConnection.connect();
        console.log('Connected successfully to server');
    } catch(err) {
        console.error("mongo error", err);
        mongoDBConnection.close();
    }
    return clusterDB;
};

module.exports = { createMongoDBConnection, dbConfig };    