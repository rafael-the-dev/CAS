const { v4 } = require("uuid")
const { ApolloError, ForbiddenError } = require("apollo-server-express")

const { deleteImage, hasDB, saveImage } = require("../helpers");
const { getGroupDB } = require("../helpers/group")
const { dbConfig } = require("../connections");
const { User } = require("./User");

const { pubsub } = dbConfig;

class GroupChat {
    static getGroup = async ({ ID, user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });
        
        const group = await GROUP_DB.findOne({ ID, members: user.username  });
        
        return group;
    }

    static getGroups = async ({ user }) => {
        const GROUP_DB = hasDB({ dbConfig, key: "GROUP_MESSAGES_DB" });
        
        const groups = await GROUP_DB.find({ members: user.username }).toArray();
        
        return groups;
    }

    static acceptGroupInvitation = async ({ invitation, user }) => {
        const { groupID, ID } = invitation;

        const username = user.username;

        const { group, GROUP_DB } = await getGroupDB({ checkAccess: false, dbConfig, groupID, isForwardedMessage: false, username })

        const hasAcess = group.invitations.find(invitation => invitation.target === username && invitation.ID === ID);
        if(!hasAcess) throw new ForbiddenError("You don't have acess to this invitation");

        const invitations = [ ...group.invitations.filter(invitation => invitation.ID !== ID) ];
        const members = [ ...group.members, username ];

        const userUpdated = await User.acceptGroupInvitation({ ID, username });

        await GROUP_DB.updateOne({ ID: groupID }, { $set: { invitations, members }});

        group['invitations'] = invitations;
        group['members'] = members;
        
        pubsub.publish("USER_UPDATED", { userUpdated });
        pubsub.publish("GROUP_UPDATED", { groupUpdated: { ...group } });

        return true;
    }

    static createGroup = async ({ group, user }) => {
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
            invitations: [],
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

    static deleteMessage = async ({ groupID, messageID, user }) => {
        const { group, GROUP_DB } = await getGroupDB({ checkAccess: true, dbConfig, groupID, isForwardedMessage: false, username: user.username })

        const messages = [ ...group.messages ];
        const message = messages.find(item => item.ID === messageID);

        if(message) {
            if(Boolean(message.image)) {
                await deleteImage({ url: message.image })
            }

            message['isDeleted'] = true;
            message['image'] = "";
            message['text'] = "This message was deleted";
            message['reply'] = null;
        } else {
            throw new UserInputError("Invalid message ID");
        }

        await GROUP_DB.updateOne({ ID: groupID }, { $set: { messages }});

        group['messages'] = messages;

        pubsub.publish("GROUP_UPDATED", { groupUpdated: { ...group } });

        return group;
    }

    static leaveGroup = async ({ groupID, isRemoved, removedUser, user }) => {
        const { group, GROUP_DB } = await getGroupDB({ checkAccess: true, dbConfig, groupID, isForwardedMessage: false, username: user.username })

        const { username } = user;
        let userToRemove = null;

        if(removedUser === username) {
            userToRemove = username
        } else {
            if(isRemoved && group.admin === username) {
                userToRemove = removedUser;
            } else {
                throw new ForbiddenError("Only group admins can remove users!");
            }
        }

        const members = [ ...group.members.filter(member => member !== userToRemove) ];
        await User.leaveGroup({ groupID, username: userToRemove });
        await GROUP_DB.updateOne({ ID: groupID }, { $set: { members }});

        group['members'] = members;

        pubsub.publish("GROUP_UPDATED", { groupUpdated: { ...group } });

        return group;
    }

    static readMessage = async ({ chatID, user }) => {
        const { group, GROUP_DB } = await getGroupDB({ checkAccess: true, dbConfig, groupID: chatID, isForwardedMessage: false, username: user.username })

        const messages = [ ...group.messages ];

        messages.forEach(message => {
            if(message.sender !== user.username) {
                const result =  message['isRead'].find(report => report.username === user.username);
                
                if(result) result['isRead'] = true;
            } 
        });

        await GROUP_DB.updateOne({ ID: chatID }, { $set: { messages }});

        group['messages'] = messages;
        pubsub.publish("GROUP_UPDATED", { groupUpdated: { ...group } });
        return group;
    }

    static rejectMembershipInvitation = async ({ invitation, user }) => {
        const { groupID, ID } = invitation;
        const username = user.username;

        const { group, GROUP_DB } = await getGroupDB({ checkAccess: false, dbConfig, groupID, isForwardedMessage: false, username })
        
        const hasAcess = group.invitations.find(invitation => invitation.target === username && invitation.ID === ID);
        if(!hasAcess) throw new ForbiddenError("You don't have acess to this invitation");

        const invitations = [ ...group.invitations.filter(invitation => invitation.ID !== ID) ];

        const userUpdated = await User.removeGroupInvitation({ ID, username })

        await GROUP_DB.updateOne({ ID: groupID }, { $set: { invitations }});
        //await User.addGroupInvitation({ invitation: targetInvitation, username: target })

        group['invitations'] = invitations;
        
        pubsub.publish("USER_UPDATED", { userUpdated });
        pubsub.publish("GROUP_UPDATED", { groupUpdated: { ...group } });

        return true;
    }

    static sendInvitation = async ({ dest, user }) => {

    }

    static sendMessage = async ({ messageInput, user }) => {
        const { groupID, image, isForwarded, text, reply } = messageInput;

        const { group, GROUP_DB } = await getGroupDB({ checkAccess: true, dbConfig, groupID, isForwardedMessage: isForwarded, username: user.username })

        if(!Boolean(text) && !Boolean(image)) throw new UserInputError("Empty message");

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

        const isRead = group.members
            .filter(member => member !== user.username)
            .map(member => ({ isRead: false, username: member }));

        const newMessage = {
            ID: v4(),
            createdAt: Date.now().toString(),
            isDeleted: false,
            isForwarded,
            image: imageFile,
            isRead,
            text,
            reply: replyMessage,
            sender: user.username
        };

        const messages = [ ...group.messages, newMessage ];
        await GROUP_DB.updateOne({ ID: group.ID }, { $set: { messages }});

        group['messages'] = messages;
        pubsub.publish("GROUP_UPDATED", { groupUpdated: { ...group } });
        return group;
    }

    static sendMembershipInvitation = async ({ groupID, target, user }) => {
        const username = user.username;
        
        const { group, GROUP_DB } = await getGroupDB({ checkAccess: true, dbConfig, groupID, isForwardedMessage: false, username })
        if(group.admin !== username) throw new ForbiddenError("Only group admins can send invitations.");

        const hasInvited = group.invitations.find(invitation => invitation.target === target);

        if(hasInvited) {
            throw new ApolloError("You have already invited this user.");
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
        await User.addGroupInvitation({ invitation: targetInvitation, username: target })

        group['invitations'] = invitations;

        pubsub.publish("GROUP_UPDATED", { groupUpdated: { ...group } });

        return group;
    }
}

module.exports = { GroupChat }