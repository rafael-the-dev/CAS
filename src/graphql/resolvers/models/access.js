const { Acess } = require("../../../models/Acess")

const accessResolver = {
    queries: {},
    mutations: {
        async login(_, { password, username }, ) {
            const access = await Acess.login({ password, pubsub, username });
            return access;
        },
        async logout(_, args, { user }) {
            const result = await Acess.logout({ ...user, pubsub, user });
            return result;
        },
        revalidateToken(_, args, { user }) {
            const access = Acess.revalidateToken({ user });
            return access;
        },
        async validateToken(_, { token }) {
            const access = await Acess.validateToken({ pubsub, token });
            return access;
        }
    }
};

module.exports = { accessResolver };