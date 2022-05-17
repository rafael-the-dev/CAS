

const resolvers = {
    Query: {
        user(_, { id }) {

        },
        users() {
            return [];
        }
    }
};

module.exports = { resolvers };