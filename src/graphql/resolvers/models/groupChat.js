const { GroupChat } = require("../../../models/GroupChat")

const groupChatResolver = {
    queries: {
        async group(_, { ID }, { user }) {
            const group = await GroupChat.getGroup({ ID, user });
            return group;
        },
        async groups(_, args, { user }) {
            const groups = await GroupChat.getGroups({ user });
            return groups;
        }
    },
    mutations: {
        async acceptGroupInvitation(_, args, { user }) {
            const result = await GroupChat.acceptGroupInvitation({ invitation: { ...args }, pubsub, user });
            return result;
        },
        async createGroup(_, { group }, { user }) {
            const newGroup = await GroupChat.createGroup({ group, pubsub, user });
            return newGroup;
        },
        async deleteGroupMessage(_, args, { user }) {
            const group = await GroupChat.deleteMessage({ ...args, pubsub, user });
            return group;
        },
        async leaveGroup(_, args, { user }) {
            const group = await GroupChat.leaveGroup({ ...args, pubsub, user })
            return group;
        },
        async readGroupMessage(_, { chatID }, { user }) {
            const chat = await GroupChat.readMessage({ chatID, pubsub, user });
            return chat;
        },
        async rejectGroupInvitation(_, args, { user }) {
            const result = await GroupChat.rejectMembershipInvitation({ invitation: { ...args }, pubsub, user });
            return result;
        },
        async sendGroupMessage(_, { messageInput }, { user }) {
            const group = await GroupChat.sendMessage({ messageInput, pubsub, user });
            return group;
        },
        async sendGroupInvitation(_, { invitation }, { user }) {
            const { groupID, target } = invitation;
            await GroupChat.sendMembershipInvitation({ groupID, pubsub, target, user });
            return true;
        },
    }
};

module.exports = { groupChatResolver };