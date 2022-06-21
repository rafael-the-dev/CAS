const  { v4 } = require("uuid")
const { ApolloError, ForbiddenError, UserInputError } = require("apollo-server-express");

const { hasAcess, hasDB, saveImage } = require("../helpers")
const { dbConfig } = require("../connections");


class DirectChat {
    // QUERIES
    // retrieve chat by ID and by users' names
    static getChat = async ({ id, dest, user }) => {
        const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });
          
        const chat = await directMessagesDB.findOne({ $or: [ { ID: id }, { users: { $all: [dest, user.username] } }] })
        
        return chat;
    }

    // retrieve user's chat by his name
    static getChats = async ({ user }) => {
        const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });
        
        const chats = await directMessagesDB.find({ users: user.username }).toArray();
        
        return chats;
    }

    //MUTATIONS

    static deleteChat = async ({ remover, target }) => {
        const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });

        const chat = await directMessagesDB.findOne({ users: { $all: [ remover, target ] }});
        if(chat === null ) throw new UserInputError("Invalid chat ID");

        await directMessagesDB.deleteOne({ users: { $all: [ remover, target ] }});
    }

    static deleteMessage = async ({ chatID, destinatary, messageID, pubsub, user }) => {
        const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });

        const chat = await directMessagesDB.findOne({ ID: chatID });
        if(chat === null ) throw new UserInputError("Invalid chat ID");

        hasAcess({ users: chat.users, username: user.username })
        //if(!chat.users.includes(user.username) ) throw new ForbiddenError("You dont't have access to this chat");

        const messages = [ ...chat.messages ];
        const message = messages.find(item => item.ID === messageID);

        if(message) {
            message['isDeleted'] = true;
            message['text'] = "This message was deleted";
            message['reply'] = null;
        } else {
            throw new UserInputError("Invalid message ID");
        }

        await directMessagesDB.updateOne({ ID: chatID }, { $set: { messages }});

        chat['messages'] = messages;
        pubsub.publish("MESSAGE_SENT", { messageSent: { ...chat, destinatary, sender: user.username } });
        return chat;
    }

    static readMessage = async ({ chatID, pubsub, user }) => {
        const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });

        const chat = await directMessagesDB.findOne({ ID: chatID });
        if(chat === null ) throw new UserInputError("Invalid chat ID"); 

        hasAcess({ users: chat.users, username: user.username })
        //if(!chat.users.includes(user.username) ) throw new ForbiddenError("You dont't have access to this chat");

        const messages = [ ...chat.messages ];
        let destinatary = null;
        messages.forEach(message => {
            if(message.sender !== user.username) {
                message['isRead'] = true;
                destinatary = message.sender;
            } 
        });

        await directMessagesDB.updateOne({ ID: chatID }, { $set: { messages }});

        chat['messages'] = messages;
        pubsub.publish("MESSAGE_SENT", { messageSent: { ...chat, destinatary, sender: user.username } });
        return chat;
    }

    static sendMessage = async ({ messageInput, pubsub, user }) => {
        const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });

        const { chatID, destinatary, image, isForwarded, text, reply } = messageInput;

        if(!Boolean(text) && !Boolean(image)) throw new UserInputError("Empty message");

        let chat = null;

        if(isForwarded) {
            chat = await directMessagesDB.findOne({ users: { $all: [destinatary, user.username] }})
        } else {
            chat = await directMessagesDB.findOne({ ID: chatID });
        }

        if(chat === null ) throw new UserInputError("Invalid chat ID");

        hasAcess({ users: chat.users, username: user.username })
        //if(!chat.users.includes(user.username) ) throw new ForbiddenError("You dont't have access to this chat");

        let replyMessage = null;
        if(reply) {
            const result = chat.messages.find(item => item.ID === reply);
            if(result) replyMessage = { 
                createdAt: result.createdAt, 
                ID: result.ID,
                image: result.image, 
                sender: result.sender,
                text: result.text 
            };
        }

        let imageFile;
        if(image) {
            imageFile = await saveImage({ folder: "chats", image })
            /*const { createReadStream, filename } = await image;

            const { ext, name } = path.parse(filename);
            const time = moment().format("DDMMYYYY_HHmmss");
            const newName = `${name}_${time}${ext}`
            imageFile = `images/chats/${newName}`;
            const stream = createReadStream();
            const pathName = path.join(path.resolve("."), `/public/images/chats/${newName}`);
            const out = fs.createWriteStream(pathName);
            await stream.pipe(out);*/
        }

        const newMessage = {
            ID: v4(),
            createdAt: Date.now().toString(),
            isDeleted: false,
            isForwarded,
            image: imageFile,
            isRead: false,
            text,
            reply: replyMessage,
            sender: user.username
        };

        const messages = [ ...chat.messages, newMessage ];
        await directMessagesDB.updateOne({ ID: chat.ID }, { $set: { messages }});

        chat['messages'] = messages;
        pubsub.publish("MESSAGE_SENT", { messageSent: { ...chat, destinatary, sender: user.username } });
        return chat;
    }
}

module.exports = { DirectChat }