const { ApolloError, UserInputError } = require("apollo-server-express")

const fetchData = async ({ db, errorMessage, filter }) => {
    const result = await db.find(filter).toArray();;

    if(result === null) throw new UserInputError(errorMessage);
    //console.log("result", result)
    return result;
};

const fetchByID = async ({ db, errorMessage, filter }) => {
    const result = await db.findOne(filter);
    
    if(result === null) throw new UserInputError(errorMessage);

    return result;
};

const hasDB = ({ dbConfig, key }) => {
    switch(key) {
        case "DIRECT_MESSAGES_DB": {
            return dbConfig.directMessagesDB;
        }
        case "GROUPS_DB": {
            return dbConfig.groupsDB;
        }
        case "GROUP_MESSAGES_DB": {
            return dbConfig.groupMessagesDB;
        }
        case "USERS_DB": {
            return dbConfig.usersDB;
        }
        default: {
            throw new ApolloError("DB connection closed");
        }
    }
};

module.exports = { fetchData, fetchByID, hasDB };