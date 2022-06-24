const { ApolloError, UserInputError } = require("apollo-server-express");
const  { v4 } = require("uuid");

const { hasDB } = require("../helpers/db")
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
        const targetResult = await User.removeFriendship({ target: user.username, username: target });
        const removerResult = await User.removeFriendship({ target, username: user.username });

        await DirectChat.deleteChat({ remover: user.username, target });

        const receiver = await User.getUser({ username: target });
        const sender = await User.getUser({ username: user.username });

        const result = {
            ID: "",
            status: "DELETED", 
            receiver,
            sender
        };

        pubsub.publish('FRIENDSHIP_INVITATION_ACCEPTED', { friendshipInvitationAccepted: result }); 

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
        const FRIENDSHIP_INVITATIONS_DB = hasDB({ dbConfig, key: "FRIENDSHIP_INVITATIONS_DB" });

        const targetUser =  await User.getUser({ username: targetUsername });
        user = await User.getUser({ username: user.username });

        const id = v4();
        const invitation = {
            ID: id,
            active: true,
            description: description ? description : "",
            datetime: Date.now().toString(),
            sender: { image: user.image, name: user.name, username: user.username },
            target: { image: targetUser.image, name: targetUser.name, username: targetUser.username }
        };

        let friendshipInvitations = await FRIENDSHIP_INVITATIONS_DB.findOne({ 
            $or: [ 
                { "sender.username": user.username, "target.username": targetUsername },
                { "target.username": user.username, "sender.username": targetUsername }
            ] 
        }) 
        console.log(friendshipInvitations)
        //const hasInvited = targetUser.friendshipInvitations.find(item => item.sender.username === user.username);
        if(Boolean(friendshipInvitations)) throw new ApolloError("You cannot send friendship invitation twice");
        
        await User.addFriendshipInvitation({ id, username: targetUsername });
        await User.addFriendshipInvitation({ id, username: user.username });
        await FRIENDSHIP_INVITATIONS_DB.insertOne(invitation);

        pubsub.publish('FRIENDSHIP_INVITATION_SENT', { friendshipInvitationSent: { ...invitation, id: targetUsername } }); 

        return invitation;

    }
}

module.exports = { Friendship };