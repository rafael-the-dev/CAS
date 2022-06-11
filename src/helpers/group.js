const { hasAcess, hasDB } = require("./db");
const { ApolloError, ForbiddenError, UserInputError } = require("apollo-server-express")

const getGroupDB = async ({ checkAccess, dbConfig, groupID, isForwardedMessage, username }) => {
    const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });

    let group = null;

    if(isForwardedMessage) 
        group = await GROUP_DB.findOne({ members: { $all: [ username ] }});
    else 
        group = await GROUP_DB.findOne({ ID: groupID });

    if(group === null) throw new UserInputError("Invalid group ID"); 

    if(checkAccess) hasAcess({ users: group.members, username });

    return { group, GROUP_DB };
};

module.exports = { getGroupDB };