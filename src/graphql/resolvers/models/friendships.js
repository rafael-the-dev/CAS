const { Friendship } = require("../../../models/Friendship");
const { User } = require("../../../models/User");

const friendshipsResolver = {
    queries: {
        async friendships(_, args, { user }) {
            const list = await User.getFriendships({ user });
            
            return list;
        },
        async friendshipInvitations(_, args, { user }) {
            const invitations = User.getFriendshipInvitations({ user })

            return invitations;
        }
    },
    mutations: {
        async acceptFriendshipInvitation(_, { id }, { user }) {
            const invitation = await Friendship.acceptInvitation({ id, user });
            return invitation;
        },
        async deleteFriendship(parent, { username }, { user }) {
            const result = await Friendship.deleteFriendship({ pubsub, target: username, user });
            return result;
        },
        async rejectFriendshipInvitation(parent, { id }, { user }) {
            const invitation = await Friendship.rejectInvitation({ id, user });
            return invitation;
        },
        async sendFriendshipInvitation(_, args, { user }) {
            const invitation = await Friendship.sendInvitation({ ...args, user });
            return invitation;

        },
    }
};

module.exports = { friendshipsResolver };