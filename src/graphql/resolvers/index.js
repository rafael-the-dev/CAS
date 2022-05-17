const { dbConfig } = require("../../connections");
const { fetchData, fetchByID, hasDB } = require("../../helpers");
const { ApolloError, UserInputError } = require("apollo-server-express")

const resolvers = {
    Query: {
        user(_, { id }) {

        },
        async users() {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            
            const list = await fetchData({ db, errorMessage: "", filter: {} });

            return list;
        }
    },
    Mutation: {
        async registerUser(_, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const registedUser = await fetchByID({ db, filter: { username: user.username }});
            if(registedUser !== null ) throw new UserInputError("Username not available");

            await db.insertOne(user);
            return user;
        }
    }
};

module.exports = { resolvers };