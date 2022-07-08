const { DirectChat } = require("../../../models/DirectChat")

const directChatResolver = {
    queries: {
        async directChat(_, { id, dest }, { user }) {
            const chat = await DirectChat.getChat({ dest, id, user });
            return chat;
        },
        async directChats(_, args, { user }) {
            const chats = await DirectChat.getChats({ user });
            return chats;
        }
    },
    mutations: {
        async deleteDirectMessage(_, args, { user }) {
            const chat = await DirectChat.deleteMessage({ ...args, pubsub, user });
            return chat;
        },
        async readMessage(_, { chatID }, { user }) {
            const chat = await DirectChat.readMessage({ chatID, pubsub, user });
            return chat;
        },
        async sendDirectMessage(_, { messageInput }, { user }) {
            const chat = await DirectChat.sendMessage({ messageInput, pubsub, user });
            return chat;
        },
    },
};

module.exports = { directChatResolver };