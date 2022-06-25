const { ApolloError, UserInputError } = require("apollo-server-express");
const  { v4 } = require("uuid");

const { hasDB } = require("../helpers/db")
const { dbConfig } = require("../connections");
const { User } = require("./User");
const { DirectChat } = require("./DirectChat");

class Friendship {
    static acceptInvitation = async ({ id, pubsub, user }) => {
        const FRIENDSHIP_INVITATIONS_DB = hasDB({ dbConfig, key: "FRIENDSHIP_INVITATIONS_DB" });
        const invitation = await FRIENDSHIP_INVITATIONS_DB.findOne({ ID: id });

        if(!Boolean(invitation)) throw new UserInputError("Friendship invitation not found.");

        await FRIENDSHIP_INVITATIONS_DB.deleteOne({ ID: id });

        const chatID = v4();

        const senderUsername = invitation.sender.username;
        const targetUsername = invitation.target.username;

        await DirectChat.createChat({ users: [ targetUsername, senderUsername ]});
        const sender = await User.acceptFriendshipInvitation({ chatID, invitationID: id, newFriend: targetUsername, username: senderUsername })
        const target = await User.acceptFriendshipInvitation({ chatID, invitationID: id, newFriend: senderUsername, username: targetUsername })
        
        const result = {
            ID: id,
            status: "ACCEPTED", 
            receiver: target,
            sender
        };

        pubsub.publish('FRIENDSHIP_INVITATION_ACCEPTED', { friendshipInvitationAccepted: result }); 
        pubsub.publish('FRIENDSHIP_INVITATION_SENT', { friendshipInvitationSent: 
            { 
                ...invitation, active: false, id: senderUsername 
            } 
        }); 
        pubsub.publish('FRIENDSHIP_INVITATION_SENT', { friendshipInvitationSent: 
            { 
                ...invitation, active: false, id: targetUsername 
            } 
        }); 

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

    static rejectInvitation = async ({ id, pubsub, user }) => {
        const FRIENDSHIP_INVITATIONS_DB = hasDB({ dbConfig, key: "FRIENDSHIP_INVITATIONS_DB" });
        const invitation = await FRIENDSHIP_INVITATIONS_DB.findOne({ ID: id });

        if(!Boolean(invitation)) throw new UserInputError("Friendship invitation not found.");
        let target ="";

        if(invitation.sender.username === user.username) {
            target = invitation.target.username;
        } else {
            target = invitation.sender.username;
        }

        await FRIENDSHIP_INVITATIONS_DB.deleteOne({ ID: id });
        await User.removeFriendshipInvitation({ id, username: user.username });
        await User.removeFriendshipInvitation({ id, username: target });

        const invitationStatus = { 
            ID: id,
            id: user.username, 
            receiver: {},
            status: "DELETED",
            sender: {}
        };

        pubsub.publish('FRIENDSHIP_INVITATION_SENT', { friendshipInvitationSent: 
            { 
                ...invitation, active: false, id: target 
            } 
        }); 
        pubsub.publish('FRIENDSHIP_INVITATION_SENT', { friendshipInvitationSent: 
            { 
                ...invitation, active: false, id: user.username 
            } 
        }); 
        
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
        pubsub.publish('FRIENDSHIP_INVITATION_SENT', { friendshipInvitationSent: { ...invitation, id: user.username } }); 

        return invitation;

    }
}

module.exports = { Friendship };