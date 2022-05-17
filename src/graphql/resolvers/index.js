const { dbConfig } = require("../../connections");
const { fetchData, fetchByID, hasDB } = require("../../helpers");
const { ApolloError, UserInputError } = require("apollo-server-express")
const bcrypt = require("bcrypt");
const  { v4 } = require("uuid")
const SECRET_KEY = '53a0d1a4174d2e1b8de701437fe06c08891035ed4fd945aef843a75bed2ade0657b3c4ff7ecd8474cb5180b2666c0688bbe640c9eb3d39bb9f2b724a10f343c6';

const resolvers = {
    Query: {
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
            //const friends = await fetchData({ db: friendsDB, filter: {} })

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
            
            if(await bcrypt.compare(password, user.password)) {
                const acessToken = jwt.sign({ name: user.name, username }, SECRET_KEY, { expiresIn: "25m" });
                const verifiedToken = jwt.verify(acessToken, SECRET_KEY);

                return { acessToken: { expiresIn: verifiedToken.exp, token: acessToken }, name: user.name, username };
            } else {
                throw new UserInputError("Username or password Invalid");
            }
        },
        async sendContactInvitation(_, { description, targetUsername }, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const targetUser =  await db.findOne({ username: targetUsername });
            const invitation = {
                ID: v4(),
                active: true,
                description: description ? description : "",
                datetime: Date.now().toString(),
                sender: user
            }
            const friendshipInvitations = [ invitation, ...targetUser.friendshipInvitations ]
            await db.updateOne({ username: targetUsername }, { $set: { friendshipInvitations }})

        },
        async registerUser(_, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const registedUser =  await db.findOne({ username: user.username });
            if(registedUser !== null ) throw new UserInputError("Username not available");

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
                isOnline: false,
                password: hashedPassword
            };

            await db.insertOne(userToRegister);
            return userToRegister;
        }
    }
};

module.exports = { resolvers };