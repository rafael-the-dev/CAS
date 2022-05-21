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
        async friendshipInvitations(_, args, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            
            user = await db.findOne({ username: user.username });
            return user.friendshipInvitations;
        },
        async user(_, { username }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            //const friendsDB = hasDB({ dbConfig, key: "USERS_DB" });
            //const groupsDB = hasDB({ dbConfig, key: "USERS_DB" });
            /*const users = await db.aggregate([
                { $match: { username } }, 
                { $unwind: "$friendships" },
                //{ $unwind: "$friendships.username" },
                { $lookup:
                   {
                     from: 'users',
                     localField: 'friendships.username',
                     foreignField: 'username',
                     as: 'friendships'
                   }
                }
            ]).pretty();
            console.log(users)*/
            const user = await fetchByID({ db, filter: { username }});

            return user;
        },
        async users() {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            /*const users = await db.aggregate([
                //{ $match: { username } }, 
                { $unwind: "$friendships" },
                //{ $unwind: "$friendships.username" },
                { $lookup:
                   {
                     from: 'users',
                     localField: 'friendships.username',
                     foreignField: 'username',
                     as: 'friendships'
                   }
                },
                {$unwind:"$friendships"},
                {$project:{
                    "_id":1,
                    "user":[{
                        "image":"$friendships.image"    ,
                        "name":"$friendships.name"    ,
                        "username":"$friendships.username"
                    }]
                }}
            ]).toArray();
            console.log(users)*/
            const list = await fetchData({ db, errorMessage: "", filter: {} });

            return list;
        }
    },
    Mutation: {
        async login(_, { password, username }, ) {
            const usersDB = hasDB({ dbConfig, key: "USERS_DB" })

            const user = await usersDB.findOne({ username });
            if(user === null) throw new UserInputError("Username or password Invalid");
                console.log(user)
            if(await bcrypt.compare(password, user.password)) {
                const acessToken = jwt.sign({ name: user.name, username }, SECRET_KEY, { expiresIn: "25m" });
                const verifiedToken = jwt.verify(acessToken, SECRET_KEY);

                return { acessToken: { expiresIn: verifiedToken.exp, token: acessToken }, image: user.image, name: user.name, username };
            } else {
                throw new UserInputError("Username or password Invalid");
            }
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

            return invitation;

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
            const savedUser = await usersDB.findOne({ username: user.username });
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
        friendshipInvitationsSent: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(["FRIENDSHIP_INVITATION_SENT"]),
                (payload, variables) => payload.feedbackUpdated.ID === variables.id
            )
        },
        userCreated: {
            subscribe:() => pubsub.asyncIterator(["USER_CREATED"])
        }
    }
};

module.exports = { resolvers };