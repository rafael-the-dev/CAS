const { ApolloError, UserInputError } = require("apollo-server-express");
const  { v4 } = require("uuid");

const { hasDB } = require("../helpers")
const { dbConfig } = require("../connections");
const { User } = require("./User");
const { DirectChat } = require("./DirectChat");

class Friendship {
    static acceptInvitation = async ({ id, pubsub, user }) => {
        const db = hasDB({ dbConfig, key: "USERS_DB" });
        const directMessagesDB = hasDB({ dbConfig, key: "DIRECT_MESSAGES_DB" });
        user = await db.findOne({ username: user.username });

        const invitation = user.friendshipInvitations.find(item => item.ID === id);
        if(!Boolean(invitation)) throw new UserInputError("Friendship invitation not found.");

        const friendshipInvitations = [  ...user.friendshipInvitations.filter(item => item.ID !== id) ]
        await db.updateOne({ username: user.username }, { $set: { friendshipInvitations }});
        const sender = await db.findOne({ username: invitation.sender.username })

        const chatID = v4();
        const chat = {
            ID: chatID,
            datetime: Date.now().valueOf(),
            messages: [],
            users: [ sender.username, user.username ]
        };

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

    }

    static deleteFriendship = async ({ target, pubsub, user }) => {
        const db = hasDB({ dbConfig, key: "USERS_DB" });

        const targetResult = await User.removeFriendship({ username: target });
        const removerResult = await User.removeFriendship({ username: user.username });

        await DirectChat.deleteChat({ remover: user.username, target });

        return true;
    }

    static rejectInvitation = async ({ id, user }) => {
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
    }

    static sendInvitation = async ({ description, pubsub, targetUsername, user }) => {
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

    }
}

module.exports = { Friendship };