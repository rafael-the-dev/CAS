const { UserInputError } = require("apollo-server-core");

class User {
    static addGroupInvitation = async ({ invitaion, pubsub, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!")

        const groupsInvitations = [ ...user.groupsInvitations, invitaion ];
        USERS_DB.updateOne({ username }, { $set: { groupsInvitations } });

        user['groupsInvitations'] = groupsInvitations;
        return user;
    }
}

module.exports = { User };