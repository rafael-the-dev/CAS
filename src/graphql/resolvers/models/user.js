const { User } = require("../../../models/User");

const userResolver = {
    queries: {
        async loggedUser(_, args, { user }) {
            const result = await User.loggedUserDetails({ username: user.username });

            return result;
        },
        async user(_, { username }) {
            const user = await User.getUser({ username });

            return user;
        },
        async users() {
            const list = await User.getUsers();

            return list;
        }
    },
    mutations: {
        async registerUser(_, { user }) {
            const result = await User.registerUser({ user });
            return result;
        }
    }
};

module.exports = { userResolver }