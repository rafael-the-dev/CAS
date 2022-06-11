const hasDB = ({ dbConfig, key }) => {
    switch(key) {
        case "DIRECT_MESSAGES_DB": {
            return dbConfig.directMessagesDB;
        }
        case "FRIENDS_DB": {
            return dbConfig.friendsDB;
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

const hasAcess = ({ users, username }) => {
    if(!users.includes(username) ) throw new ForbiddenError("You dont't have access to this chat");
    return ;
};

module.exports = { hasAcess, hasDB };