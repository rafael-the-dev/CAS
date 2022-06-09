const { UserInputError } = require("apollo-server-core");
const { hasDB } = require("../helpers")
const { dbConfig } = require("../connections");

class User {
    static addGroupInvitation = async ({ invitation, pubsub, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!")

        const groupsInvitations = [ ...user.groupsInvitations, invitation ];
        await USERS_DB.updateOne({ username }, { $set: { groupsInvitations } });

        user['groupsInvitations'] = groupsInvitations;

        pubsub.publish("USER_UPDATED", { userUpdated: user });

        return user;
    }

    static removeGroupInvitation = async ({ ID, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const groupsInvitations = [ ...user.groupsInvitations.filter(invitation => invitation.ID !== ID) ];
        await USERS_DB.updateOne({ username }, { $set: { groupsInvitations } });

        user['groupsInvitations'] = groupsInvitations;

        return user;
    }
}

module.exports = { User };