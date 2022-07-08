//const config = require("config");
const { MongoClient } = require("mongodb");
const { PubSub } = require('graphql-subscriptions');

const url = "mongodb+srv://rafael-the-dev:iH.-qJftk8g9cgc@cluster0.z64j5.mongodb.net/chatAPP?authMechanism=DEFAULT";//config.get("mongoDBConfig.url");
const dbName = "chatAPP";//config.get("mongoDBConfig.db");
const usersCollection = "users";//config.get("mongoDBConfig.collection");
const directMessagesCollection = "directMessages"
const groupMessagesCollection = "groupMessages"
const groupCollection = "groups"
const friendsCollection = "friends"
const friendshipInvitationsCollection = "friendshipInvitations";
const postsCollection = "posts";

const dbConfig = { 
    directMessagesDB: null,
    friendsDB: null,
    friendshipInvitations: null,
    groupMessagesDB: null,
    groupsDB: null,
    isConnected: false ,
    postsDB: null,
    pubsub: new PubSub(),
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
            dbConfig.friendsDB = clusterDB.collection(friendsCollection)
            dbConfig.friendshipInvitations = clusterDB.collection(friendshipInvitationsCollection)
            dbConfig.groupMessagesDB = clusterDB.collection(groupMessagesCollection)
            dbConfig.groupsDB = clusterDB.collection(groupCollection)
            dbConfig.postsDB = clusterDB.collection(postsCollection)
            //dbConfig.pubsub = new PubSub();
        });

        mongoDBConnection.on("close", () => {
            //dbConfig.db = null;
            dbConfig.isConnected = false;

            dbConfig.usersDB = null;
            dbConfig.directMessagesDB = null;
            dbConfig.groupMessagesDB = null;
            dbConfig.groupsDB = null;
            //dbConfig.pubsub = null;
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