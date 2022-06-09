const { v4 } = require("uuid")
const { ApolloError, ForbiddenError } = require("apollo-server-express")

const { hasAcess, hasDB } = require("../helpers")
const { dbConfig } = require("../connections");
const { User } = require("./User");

class GroupChat {
    static getGroup = async ({ ID, user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });
        
        const group = await GROUP_DB.findOne({ ID, members: user.username  });
        
        return group;
    }

    static getGroups = async ({ user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });
        
        const groups = await GROUP_DB.find({ members: user.username }).toArray();
        //console.log(groups)
        return groups;
    }

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

    static deleteMessage = async ({ groupID, messageID, pubsub, user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });

        const group = await GROUP_DB.findOne({ ID: groupID });
        if(group === null ) throw new UserInputError("Invalid group ID");

        hasAcess({ users: group.members, username: user.username })
        //if(!group.users.includes(user.username) ) throw new ForbiddenError("You dont't have access to this group");

        const messages = [ ...group.messages ];
        const message = messages.find(item => item.ID === messageID);

        if(message) {
            message['isDeleted'] = true;
            message['text'] = "This message was deleted";
            message['reply'] = null;
        } else {
            throw new UserInputError("Invalid message ID");
        }

        await GROUP_DB.updateOne({ ID: groupID }, { $set: { messages }});

        group['messages'] = messages;
        //pubsub.publish("MESSAGE_SENT", { messageSent: { ...group, destinatary, sender: user.username } });
        return group;
    }

    static sendInvitation = async ({ dest, pubsub, user }) => {

    }

    static sendMessage = async ({ messageInput, pubsub, user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });

        const { groupID, image, isForwarded, text, reply } = messageInput;

        if(!Boolean(text) && !Boolean(image)) throw new UserInputError("Empty message");

        let group = null;

        if(isForwarded) {
            group = await GROUP_DB.findOne({ members: { $all: [user.username] }})
        } else {
            group = await GROUP_DB.findOne({ ID: groupID });
        }

        if(group === null ) throw new UserInputError("Invalid group ID");

        hasAcess({ users: group.members, username: user.username })

        let replyMessage = null;
        if(reply) {
            const result = group.messages.find(item => item.ID === reply);
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
            imageFile = await saveImage({ folder: "chats", image });
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

        const messages = [ ...group.messages, newMessage ];
        await GROUP_DB.updateOne({ ID: group.ID }, { $set: { messages }});

        group['messages'] = messages;
        //pubsub.publish("MESSAGE_SENT", { messageSent: { ...group, destinatary, sender: user.username } });
        return group;
    }

    static sendMembershipInvitation = async ({ groupID, pubsub, target, user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });

        const group = await GROUP_DB.findOne({ ID: groupID });
        if(group === null ) throw new UserInputError("Invalid group ID");

        const username = user.username;
        hasAcess({ users: group.members, username });
        if(group.admin !== username) throw new ForbiddenError("Only group admins can send invitations.");

        const hasInvited = group.invitations.find(invitation => invitation.target === target);

        if(hasInvited) {
            //throw new ApolloError("You have already invited this user.")
        }

        const createdAt = Date.now().toString();
        const ID = v4();

        const GroupInvitation = {
            createdAt,
            ID,
            sender: username,
            target
        };

        const targetInvitation = {
            createdAt,
            groupID,
            ID,
            name: group.name,
            sender: username
        };

        const invitations = [ ...group.invitations, GroupInvitation ];

        await GROUP_DB.updateOne({ ID: groupID }, { $set: { invitations }});
        await User.addGroupInvitation({ invitation: targetInvitation, pubsub, username: target })

        group['invitations'] = invitations;

        //pubsub.publish("MESSAGE_SENT", { messageSent: { ...group, destinatary, sender: user.username } });

        return group;
    }

    static rejectMembershipInvitation = async ({ invitation, pubsub, user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });
        const { groupID, ID } = invitation;

        const group = await GROUP_DB.findOne({ ID: groupID });
        if(group === null ) throw new UserInputError("Invalid group ID");

        const username = user.username;
        const hasAcess = group.invitations.find(invitation => invitation.target === username && invitation.ID === ID);
        if(!hasAcess) throw new ForbiddenError("You don't have acess to this invitation");

        const invitations = [ ...group.invitations.filter(invitation => invitation.ID !== ID) ];

        const userUpdated = await User.removeGroupInvitation({ ID, username })

        await GROUP_DB.updateOne({ ID: groupID }, { $set: { invitations }});
        //await User.addGroupInvitation({ invitation: targetInvitation, pubsub, username: target })

        group['invitations'] = invitations;
        
        pubsub.publish("USER_UPDATED", { userUpdated });

        return true;
    }
}

module.exports = { GroupChat }