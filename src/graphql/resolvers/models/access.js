const { Acess } = require("../../../models/Acess")

const accessResolver = {
    queries: {},
    mutations: {
        login: async (_, { password, username }, ) => {
            const access = await Acess.login({ password, username });
            return access;
        },
        async logout(_, args, { user }) {
            const result = await Acess.logout({ ...user, user });
            return result;
        },
        revalidateToken(_, args, { user }) {
            const access = Acess.revalidateToken({ user });
            return access;
        },
        async validateToken(_, { token }) {
            const access = await Acess.validateToken({ token });
            return access;
        }
    }
};

module.exports = { accessResolver };