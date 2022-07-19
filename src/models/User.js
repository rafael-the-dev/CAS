const { UserInputError } = require("apollo-server-core");
const { fetchByID, hasDB, saveImage } = require("../helpers")
const { dbConfig } = require("../connections");
const bcrypt = require("bcrypt");
const  { v4 } = require("uuid");

const { pubsub } = dbConfig;

class User {
    static getFriendships = async ({ user }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const list = await USERS_DB.aggregate([
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
    }

    static getFriendshipInvitations = async ({ user }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });
        
        user = await USERS_DB.findOne({ username: user.username });

        return user.friendshipInvitations;
    }

    static getUsers = async () => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const list = await USERS_DB.find({}).toArray();

        return list;
    }

    static getUser = async ({ username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        let user = null;
        const list = await USERS_DB.aggregate([
            { $match: { username } },
            { $lookup:
                {
                    from: 'users',
                    localField: 'friendships',
                    foreignField: 'username',
                    as: 'friendships'
                },
            },
            { $lookup:
                {
                    from: 'posts',
                    localField: 'posts',
                    foreignField: 'ID',
                    as: 'posts'
                },
            },
        ]).toArray();

        if(list.length > 0) {
            user = list[0];
        }

        return user;
    }

    static loggedUserDetails = async ({ username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        let user = null;
        const list = await USERS_DB.aggregate([
            { $match: { username } },
            { $lookup:
                {
                    from: 'directMessages',
                    localField: 'directMessages',
                    foreignField: 'ID',
                    as: 'directChats'
                },
            },
            { $lookup:
                {
                    from: 'users',
                    localField: 'friendships',
                    foreignField: 'username',
                    as: 'friendships'
                },
            },
            { $lookup:
                {
                    from: 'friendshipInvitations',
                    localField: 'friendshipInvitations',
                    foreignField: 'ID',
                    as: 'friendshipInvitations'
                },
            },
            { $lookup:
                {
                    from: 'groupMessages',
                    localField: 'groups',
                    foreignField: 'ID',
                    as: 'groups'
                },
            }
        ]).toArray();

        if(list.length > 0) {
            user = list[0];
        }

        return user;
    }

    static addFriendshipInvitation = async ({ id, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!")

        const friendshipInvitations = [ id, ...user.friendshipInvitations ];
        await USERS_DB.updateOne({ username }, { $set: { friendshipInvitations } });

        user['friendshipInvitations'] = friendshipInvitations;

        return user;
    }

    static addGroupInvitation = async ({ invitation, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!")

        const groupsInvitations = [ ...user.groupsInvitations, invitation ];
        await USERS_DB.updateOne({ username }, { $set: { groupsInvitations } });

        user['groupsInvitations'] = groupsInvitations;

        pubsub.publish("USER_UPDATED", { userUpdated: user });

        return user;
    }

    static acceptFriendshipInvitation = async ({ chatID, invitationID, newFriend, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });
        const user = await USERS_DB.findOne({ username });

        const friendships = [ ...new Set([ ...user.friendships, newFriend ]) ];
        const directMessages = [ ...user.directMessages, chatID ];
        const friendshipInvitations = [  ...user.friendshipInvitations.filter(item => item.ID !== invitationID) ]

        await USERS_DB.updateOne({ username: user.username }, { $set: { directMessages, friendships, friendshipInvitations }});

        return user;
    }

    static acceptGroupInvitation = async ({ ID, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const groupsInvitations = [ ...user.groupsInvitations.filter(invitation => invitation.ID !== ID) ];
        const groups = [ ...user.groups, ID ];

        await USERS_DB.updateOne({ username }, { $set: { groupsInvitations, groups  } });

        user['groups'] = groups;
        user['groupsInvitations'] = groupsInvitations;

        return user;
    }

    static addNotification = async ({ commentId, replyId, post, target, type, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });
        const user = await USERS_DB.findOne({ username: target });

        const notification = {
            author: username,
            checked: false,
            createdAt: Date.now().toString(),
            commentId,
            ID: v4(),
            replyId,
            type,
        };

        const notifications = [ { ...notification, post }, ...user.notifications];
        await USERS_DB.updateOne({ username: target }, { $set: { notifications } });

        return notification;
    }

    static addPost = async ({ ID, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const posts = [ ...user.posts, ID ];

        await USERS_DB.updateOne({ username }, { $set: { posts } });

        user['posts'] = posts;

        return user;
    }

    static checkNotifications = async ({ username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username });

        if(user === null) throw new UserInputError("Username not found!");

        let notifications = [ ...user.notifications ];
        notifications.forEach(notification => notification.checked = true);
        
        await USERS_DB.updateOne({ username }, { $set: { notifications }});

        return true;
    };

    static edit = async ({ image, name, user, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        let registedUser =  await USERS_DB.findOne({ username: user.username });
        if(!Boolean(registedUser)) throw new UserInputError("Username not available");
        const imageFile = image;

        let newImage = null;
        if(imageFile) {
            newImage = await saveImage({ folder: "users", image: imageFile });
        }

        registedUser = {
            ...registedUser,
            image: newImage,
            name,
            username
        }

        await USERS_DB.insertOne(registedUser);

        pubsub.publish('USER_CREATED', { userCreated: registedUser }); 

        return userToRegister;
    }

    static leaveGroup = async ({ groupID, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const groups = [ ...user.groups.filter(group => group !== groupID) ];

        await USERS_DB.updateOne({ username }, { $set: { groups } });

        user['groups'] = groups;

        return user;
    }

    static removeFriendship = async ({ target, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const friendships = [ ...user.friendships.filter(user => user !== target) ];

        await USERS_DB.updateOne({ username }, { $set: { friendships } });

        user['friendships'] = friendships;

        return user;
    };

    static removeFriendshipInvitation = async ({ id, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!")

        const friendshipInvitations = [ ...user.friendshipInvitations.filter(invitationID => invitationID !== id) ];
        await USERS_DB.updateOne({ username }, { $set: { friendshipInvitations } });

        user['friendshipInvitations'] = friendshipInvitations;

        return user;
    }

    static removeGroupInvitation = async ({ ID, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const groupsInvitations = [ ...user.groupsInvitations.filter(invitation => invitation.ID !== ID) ];
        await USERS_DB.updateOne({ username }, { $set: { groupsInvitations } });

        user['groupsInvitations'] = groupsInvitations;

        return user;
    }

    static removePost = async ({ id, username }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const user = await USERS_DB.findOne({ username })

        if(user === null) throw new UserInputError("Username not found!");

        const posts = [ ...user.posts.filter(post => post !== id) ];

        await USERS_DB.updateOne({ username }, { $set: { posts } });

        user['posts'] = posts;

        return user;
    }

    static registerUser = async ({ user }) => {
        const USERS_DB = hasDB({ dbConfig, key: "USERS_DB" });

        const registedUser =  await USERS_DB.findOne({ username: user.username });
        if(registedUser !== null ) throw new UserInputError("Username not available");
        const imageFile = user.image;

        let image;
        if(imageFile) {
            image = await saveImage({ folder: "users", image: imageFile });
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

        await USERS_DB.insertOne(userToRegister);

        pubsub.publish('USER_CREATED', { userCreated: userToRegister }); 

        return userToRegister;
    }
}

module.exports = { User };