const { dbConfig } = require("../../connections");
const { fetchData, fetchByID, hasDB } = require("../../helpers");
const { ApolloError, UserInputError } = require("apollo-server-express")
const bcrypt = require("bcrypt");

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