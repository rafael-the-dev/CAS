const { v4 } = require("uuid")

const { hasDB } = require("../helpers")
const { dbConfig } = require("../connections");


class GroupChat {
    static createGroup = async ({ group, pubsub, user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });
        const { name, description } = group;

        const ID = v4();
        const username = user.username;

        const newGroup = {
            admin: username,
            createdAt: Date.now().toString(),
            description,
            ID,
            members: [ username ],
            messages: [],
            name
        }

        await GROUP_DB.insertOne(newGroup);
        user = await USERS_DB.findOne({ username })
        await USERS_DB.updateOne({ username }, { $set: { groups: [ ...user.groups, ID ] }})

        //pubsub.publish("GROUP_CREATED", { groupCreated: { ...newGroup } });

        return newGroup;
    }

    static sendInvitation = async ({ dest, pubsub, user }) => {

    }
}

module.exports = { GroupChat }