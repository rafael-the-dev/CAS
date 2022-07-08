const { GroupChat } = require("../../../models/GroupChat");

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
            const result = await GroupChat.acceptGroupInvitation({ invitation: { ...args }, user });
            return result;
        },
        async createGroup(_, { group }, { user }) {
            const newGroup = await GroupChat.createGroup({ group, user });
            return newGroup;
        },
        async deleteGroupMessage(_, args, { user }) {
            const group = await GroupChat.deleteMessage({ ...args, user });
            return group;
        },
        async leaveGroup(_, args, { user }) {
            const group = await GroupChat.leaveGroup({ ...args, user })
            return group;
        },
        async readGroupMessage(_, { chatID }, { user }) {
            const chat = await GroupChat.readMessage({ chatID, user });
            return chat;
        },
        async rejectGroupInvitation(_, args, { user }) {
            const result = await GroupChat.rejectMembershipInvitation({ invitation: { ...args }, user });
            return result;
        },
        async sendGroupMessage(_, { messageInput }, { user }) {
            const group = await GroupChat.sendMessage({ messageInput, user });
            return group;
        },
        async sendGroupInvitation(_, { invitation }, { user }) {
            const { groupID, target } = invitation;
            await GroupChat.sendMembershipInvitation({ groupID, target, user });
            return true;
        },
    }
};

module.exports = { groupChatResolver };