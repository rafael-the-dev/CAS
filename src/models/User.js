const { UserInputError } = require("apollo-server-core");
const { fetchData, fetchByID, hasDB } = require("../helpers")
const { dbConfig } = require("../connections");

class User {
    static getUser = async ({ username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await fetchByID({ db: USERS_DB, filter: { username }});

        return user;
    }

    static loggedUserDetails = async ({ username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        let user = null;
        const list = await USERS_DB.aggregate([
            { $match: { username } },
            { $lookup:
                {
                    from: 'directMessages',
                    localField: 'directMessages',
                    foreignField: 'ID',
                    as: 'directChats'
                },
            },
            { $lookup:
                {
                    from: 'users',
                    localField: 'friendships',
                    foreignField: 'username',
                    as: 'friendships'
                },
            },
            { $lookup:
                {
                    from: 'friendshipInvitations',
                    localField: 'friendshipInvitations',
                    foreignField: 'ID',
                    as: 'friendshipInvitations'
                },
            },
            { $lookup:
                {
                    from: 'groupMessages',
                    localField: 'groups',
                    foreignField: 'ID',
                    as: 'groups'
                },
            }
        ]).toArray();

        if(list.length > 0) {
            user = list[0];
        }

        return user;
    }

    static addFriendshipInvitation = async ({ id, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!")

        const friendshipInvitations = [ id, ...user.friendshipInvitations ];
        await USERS_DB.updateOne({ username }, { $set: { friendshipInvitations } });

        user['friendshipInvitations'] = friendshipInvitations;

        return user;
    }

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

    static acceptGroupInvitation = async ({ ID, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const groupsInvitations = [ ...user.groupsInvitations.filter(invitation => invitation.ID !== ID) ];
        const groups = [ ...user.groups, ID ];

        await USERS_DB.updateOne({ username }, { $set: { groupsInvitations, groups  } });

        user['groups'] = groups;
        user['groupsInvitations'] = groupsInvitations;

        return user;
    }

    
    static leaveGroup = async ({ groupID, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const groups = [ ...user.groups.filter(group => group !== groupID) ];

        await USERS_DB.updateOne({ username }, { $set: { groups } });

        user['groups'] = groups;

        return user;
    }

    static removeFriendship = async ({ target, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const friendships = [ ...user.friendships.filter(user => user !== target) ];

        await USERS_DB.updateOne({ username }, { $set: { friendships } });

        user['friendships'] = friendships;

        return user;
    };

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