const { dbConfig } = require("../../connections");
const { fetchData, fetchByID, hasDB } = require("../../helpers");
const { ApolloError, UserInputError } = require("apollo-server-express")
const bcrypt = require("bcrypt");
const { PubSub, withFilter } = require('graphql-subscriptions');
const  { v4 } = require("uuid")
const jwt = require('jsonwebtoken');
const SECRET_KEY = '53a0d1a4174d2e1b8de701437fe06c08891035ed4fd945aef843a75bed2ade0657b3c4ff7ecd8474cb5180b2666c0688bbe640c9eb3d39bb9f2b724a10f343c6';
const fs = require("fs");
const path = require("path")
const { GraphQLUpload } = require('graphql-upload');
const moment = require("moment")

const pubsub = new PubSub()

const resolvers = {
    Upload: GraphQLUpload,
    Query: {
        async directChat(_, { id, dest }, { user }) {
            const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });
          
            const chat = await directMessagesDB.findOne({ $or: [ { ID: id }, { users: { $all: [dest, user.username] } }] })
            
            return chat;
        },
        async directChats(_, args, { user }) {
            const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });
            
            const chat = await directMessagesDB.find({ users: user.username }).toArray();
            
            return chat;
        },
        async friendships(_, args, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const list = await db.aggregate([
                { $match: { username: user.username } },
                { $lookup:
                    {
                        from: 'users',
                        localField: 'friendships',
                        foreignField: 'username',
                        as: 'friendships'
                    }
                }
            ]).toArray();

            if(list.length > 0) {
                user = list[0];
            }
            //const list = user.friendships.map(this.friendship => )
            console.log(user.friendships);
            return user.friendships;
        },
        async friendshipInvitations(_, args, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            
            user = await db.findOne({ username: user.username });
            return user.friendshipInvitations;
        },
        async user(_, { username }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            const user = await fetchByID({ db, filter: { username }});

            return user;
        },
        async users() {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            /*const users = await db.aggregate([
                { $lookup:
                   {
                     from: 'users',
                     localField: 'friendships',
                     foreignField: 'username',
                     as: 'friendships'
                   }
                }
            ]).toArray();
            console.log(users)*/
            const list = await fetchData({ db, errorMessage: "", filter: {} });
            return list;
        }
    },
    Mutation: {
        async acceptFriendshipInvitation(_, { id }, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });
            user = await db.findOne({ username: user.username });

            const invitation = user.friendshipInvitations.find(item => item.ID === id);
            if(!Boolean(invitation)) throw new UserInputError("Friendship invitation not found.");

            const friendshipInvitations = [  ...user.friendshipInvitations.filter(item => item.ID !== id) ]
            await db.updateOne({ username: user.username }, { $set: { friendshipInvitations }});
            const sender = await db.findOne({ username: invitation.sender.username })

           // const invitationStatus = { id: user.username, status: "ACCEPTED", ID: id };

            const chatID = v4();
            const chat = {
                ID: chatID,
                datetime: Date.now().valueOf(),
                messages: [],
                users: [ sender.username, user.username ]
            };

            ///const chat = { ID: chatID, messages: [] };
            const friendships = [ ...new Set([ ...user.friendships, sender.username ]) ];
            const directMessages = [ ...user.directMessages, chatID ];

            const senderFriendships = [ ...new Set([ ...sender.friendships, user.username ]) ];
            const senderDirectMessages = [ ...sender.directMessages, chatID ];

            Promise.all([
                db.updateOne({ username: user.username }, { $set: { directMessages, friendships }}),
                db.updateOne({ username: sender.username }, { $set: { directMessages: senderDirectMessages, friendships: senderFriendships }}),
                directMessagesDB.insertOne(chat)
            ]);

            const result = {
                ID: id,
                status: "ACCEPTED", 
                receiver: user,
                sender
            };
            pubsub.publish('FRIENDSHIP_INVITATION_ACCEPTED', { friendshipInvitationAccepted: result }); 

            return result;

        },
        async deleteDirectMessage(_, { chatID, destinatary, messageID }, { user }) {
            const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });

            const chat = await directMessagesDB.findOne({ ID: chatID });
            if(chat === null ) throw new UserInputError("Invalid chat ID");

            if(!chat.users.includes(user.username) ) throw new ForbiddenError("You dont't have access to this chat");

            const messages = [ ...chat.messages ];
            const message = messages.find(item => item.ID === messageID);

            if(message) {
                message['isDeleted'] = true;
                message['text'] = "This message was deleted";
            } else {
                throw new UserInputError("Invalid message ID");
            }

            await directMessagesDB.updateOne({ ID: chatID }, { $set: { messages }});

            chat['messages'] = messages;
            pubsub.publish("MESSAGE_SENT", { messageSent: { ...chat, destinatary, sender: user.username } });
            return chat;
        },
        async login(_, { password, username }, ) {
            const usersDB = hasDB({ dbConfig, key: "USERS_DB" })

            const user = await usersDB.findOne({ username });
            if(user === null) throw new UserInputError("Username or password Invalid");
                
            if(await bcrypt.compare(password, user.password)) {
                const acessToken = jwt.sign({ name: user.name, username }, SECRET_KEY, { expiresIn: "25m" });
                const verifiedToken = jwt.verify(acessToken, SECRET_KEY);

                return { acessToken: { expiresIn: verifiedToken.exp, token: acessToken }, image: user.image, name: user.name, username };
            } else {
                throw new UserInputError("Username or password Invalid");
            }
        },
        async rejectFriendshipInvitation(parent, { id }, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            user = await db.findOne({ username: user.username });

            const invitation = user.friendshipInvitations.find(item => item.ID === id);
            if(!Boolean(invitation)) throw new UserInputError("Friendship invitation not found.");

            const friendshipInvitations = [  ...user.friendshipInvitations.filter(item => item.ID !== id) ]
            await db.updateOne({ username: user.username }, { $set: { friendshipInvitations }});

            const invitationStatus = { 
                ID: id,
                id: user.username, 
                receiver: {},
                status: "DELETED",
                sender: {}
            };

            return invitationStatus;
        },
        async readMessage(_, { chatID }, { user }) {
            const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });

            const chat = await directMessagesDB.findOne({ ID: chatID });
            if(chat === null ) throw new UserInputError("Invalid chat ID"); 

            if(!chat.users.includes(user.username) ) throw new ForbiddenError("You dont't have access to this chat");

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
        },
        async sendFriendshipInvitation(_, { description, targetUsername }, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const targetUser =  await db.findOne({ username: targetUsername });
            user = await db.findOne({ username: user.username });

            const invitation = {
                ID: v4(),
                active: true,
                description: description ? description : "",
                datetime: Date.now().toString(),
                sender: { image: user.image, name: user.name, username: user.username }
            };
            const hasInvited = targetUser.friendshipInvitations.find(item => item.sender.username === user.username);
            if(Boolean(hasInvited)) throw new ApolloError("You cannot send friendship invitation twice");

            const friendshipInvitations = [ invitation, ...targetUser.friendshipInvitations ]
            await db.updateOne({ username: targetUsername }, { $set: { friendshipInvitations }});

            pubsub.publish('FRIENDSHIP_INVITATION_SENT', { friendshipInvitationSent: { ...invitation, id: targetUsername } }); 

            return invitation;

        },
        async sendDirectMessage(_, { messageInput }, { user }) {
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

            if(!chat.users.includes(user.username) ) throw new ForbiddenError("You dont't have access to this chat");

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

            const newMessage = {
                ID: v4(),
                createdAt: Date.now().toString(),
                isDeleted: false,
                isForwarded,
                image: "",
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
        },
        async registerUser(_, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const registedUser =  await db.findOne({ username: user.username });
            if(registedUser !== null ) throw new UserInputError("Username not available");
            const imageFile = user.image;

            let image;
            if(imageFile) {
                const { createReadStream, filename } = await imageFile;

                const { ext, name } = path.parse(filename);
                const time = moment().format("DDMMYYYY_HHmmss");
                const newName = `${name}_${time}${ext}`
                image = `images/users/${newName}`;
                const stream = createReadStream();
                const pathName = path.join(path.resolve("."), `/public/images/users/${newName}`);
                const out = fs.createWriteStream(pathName);
                await stream.pipe(out);
            }

            const hashedPassword = await bcrypt.hash(user.password, 10);
            const userToRegister = { 
                ...user, 
                datetime: Date.now().valueOf(),
                directMessages: [],
                friendships: [], 
                friendshipInvitations: [], 
                groups: [], 
                groupsInvitations: [],
                groupMessages: [],
                image,
                isOnline: false,
                password: hashedPassword
            };

            await db.insertOne(userToRegister);

            pubsub.publish('USER_CREATED', { userCreated: userToRegister }); 

            return userToRegister;
        },
        revalidateToken(_, args, { user }) {
            const acessToken = jwt.sign({ name: user.name, username: user.username }, SECRET_KEY, { expiresIn: "15m" });
            const verifiedUser = jwt.verify(acessToken, SECRET_KEY);
            return { expiresIn: verifiedUser.exp, token: acessToken };
        },
        async validateToken(_, { token }) {
            const user = jwt.verify(token, SECRET_KEY);

            const db = hasDB({ dbConfig, key: "USERS_DB" });
            const savedUser = await db.findOne({ username: user.username });
            
            return { acessToken: { expiresIn: user.exp, token }, image: savedUser.image, name: user.name, username: user.username };
        }
    },
    Subscription: {
        feedbackCreated: {
            subscribe: () => pubsub.asyncIterator(['FEEDBACK_CREATED'])
        },
        feedbackDeleted: {
            subscribe: () => pubsub.asyncIterator(['FEEDBACK_DELETED'])
        },
        feedbackUpdated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['FEEDBACK_UPDATED']),
                (payload, variables) => {
                  // Only push an update if the comment is on
                  // the correct repository for this operation
                  //console.log(payload)
                  return (payload.feedbackUpdated.ID === variables.id || variables.id === "null");
                },
            ),
        },
        friendshipInvitationAccepted: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(["FRIENDSHIP_INVITATION_ACCEPTED"]),
                (payload, variables) => {
                    const isSender = payload.friendshipInvitationAccepted.sender.username === variables.id;
                    const isReceiver = payload.friendshipInvitationAccepted.receiver.username === variables.id;

                    return isSender || isReceiver;
                }
            )
        },
        friendshipInvitationSent: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(["FRIENDSHIP_INVITATION_SENT"]),
                (payload, variables) => payload.friendshipInvitationSent.id === variables.id
            )
        },
        messageSent: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['MESSAGE_SENT']),
                (payload, variables) => {
                    const sender = payload.messageSent.sender;
                    const destinatary = payload.messageSent.destinatary;

                    const hasDestinatary = variables.users.includes(destinatary);
                    const hasSender = variables.users.includes(sender);
                    console.log(variables.users, hasDestinatary, hasSender)
                    const w = variables.users[0] === destinatary && variables.users[1] === destinatary;
                    console.log(variables.users, destinatary, w)
                    
                    return (hasDestinatary && hasSender) || w ;
                }
            ),
        },
        userCreated: {
            subscribe:() => pubsub.asyncIterator(["USER_CREATED"])
        }
    }
};

module.exports = { resolvers };