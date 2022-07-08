const { Friendship } = require("../../../models/Friendship")

const friendshipsResolver = {
    queries: {
        async friendships(_, args, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const list = await db.aggregate([
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
        },
        async friendshipInvitations(_, args, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });
            
            user = await db.findOne({ username: user.username });

            return user.friendshipInvitations;
        }
    },
    mutations: {
        async acceptFriendshipInvitation(_, { id }, { user }) {
            const invitation = await Friendship.acceptInvitation({ id, pubsub, user });
            return invitation;
        },
        async deleteFriendship(parent, { username }, { user }) {
            const result = await Friendship.deleteFriendship({ pubsub, target: username, user });
            return result;
        },
        async rejectFriendshipInvitation(parent, { id }, { user }) {
            const invitation = await Friendship.rejectInvitation({ id, pubsub, user });
            return invitation;
        },
        async sendFriendshipInvitation(_, args, { user }) {
            const invitation = await Friendship.sendInvitation({ ...args, pubsub, user });
            return invitation;

        },
    }
};

module.exports = { friendshipsResolver };