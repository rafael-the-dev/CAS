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
const moment = require("moment");
const { DirectChat } = require("../../models/DirectChat");
const { Acess } = require("../../models/Acess");
const { Friendship } = require("../../models/Friendship");
const { GroupChat } = require("../../models/GroupChat");

const pubsub = new PubSub()

const resolvers = {
    Upload: GraphQLUpload,
    Query: {
        async directChat(_, { id, dest }, { user }) {
            const chat = await DirectChat.getChat({ dest, id, user });
            return chat;
        },
        async directChats(_, args, { user }) {
            const chats = await DirectChat.getChats({ user });
            return chats;
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
            
            return user.friendships;
        },
        async friendshipInvitations(_, args, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            
            user = await db.findOne({ username: user.username });

            return user.friendshipInvitations;
        },
        async group(_, { ID }, { user }) {
            const group = await GroupChat.getGroup({ ID, user });
            return group;
        },
        async groups(_, args, { user }) {
            const groups = await GroupChat.getGroups({ user });
            return groups;
        },
        async user(_, { username }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const user = await fetchByID({ db, filter: { username }});
            console.log(user)
            return user;
        },
        async users() {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const list = await fetchData({ db, errorMessage: "", filter: {} });

            return list;
        }
    },
    Mutation: {
        async acceptFriendshipInvitation(_, { id }, { user }) {
            const invitation = await Friendship.acceptInvitation({ id, pubsub, user });
            return invitation;
        },
        async acceptGroupInvitation(_, args, { user }) {
            const result = await GroupChat.acceptGroupInvitation({ invitation: { ...args }, pubsub, user });
            return result;
        },
        async createGroup(_, { group }, { user }) {
            const newGroup = await GroupChat.createGroup({ group, pubsub, user });
            return newGroup;
        },
        async deleteDirectMessage(_, args, { user }) {
            const chat = await DirectChat.deleteMessage({ ...args, pubsub, user });
            return chat;
        },
        async deleteGroupMessage(_, args, { user }) {
            const group = await GroupChat.deleteMessage({ ...args, pubsub, user });
            return group;
        },
        async login(_, { password, username }, ) {
            const access = await Acess.login({ password, pubsub, username });
            return access;
        },
        async logout(_, args, { user }) {
            const result = await Acess.logout({ ...user, pubsub });
            return result;
        },
        async leaveGroup(_, args, { user }) {
            const group = await GroupChat.leaveGroup({ ...args, pubsub, user })
            return group;
        },
        async rejectFriendshipInvitation(parent, { id }, { user }) {
            const invitation = await Friendship.rejectInvitation({ id, user });
            return invitation;
        },
        async rejectGroupInvitation(_, args, { user }) {
            const result = await GroupChat.rejectMembershipInvitation({ invitation: { ...args }, pubsub, user });
            return result;
        },
        async readMessage(_, { chatID }, { user }) {
            const chat = await DirectChat.readMessage({ chatID, pubsub, user });
            return chat;
        },
        async readGroupMessage(_, { chatID }, { user }) {
            const chat = await GroupChat.readMessage({ chatID, pubsub, user });
            return chat;
        },
        async sendFriendshipInvitation(_, args, { user }) {
            const invitation = await Friendship.sendInvitation({ ...args, pubsub, user });
            return invitation;

        },
        async sendDirectMessage(_, { messageInput }, { user }) {
            const chat = await DirectChat.sendMessage({ messageInput, pubsub, user });
            return chat;
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
            const access = Acess.revalidateToken({ user });
            return access;
        },
        async validateToken(_, { token }) {
            const access = Acess.validateToken({ pubsub, token });
            return access;
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
        groupUpdated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(["GROUP_UPDATED"]),
                (payload, variables) => payload.groupUpdated.ID === variables.id
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
        },
        userUpdated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['USER_UPDATED']),
                (payload, variables) => payload.userUpdated.username === variables.username
            ),
        },
    }
};

module.exports = { resolvers };