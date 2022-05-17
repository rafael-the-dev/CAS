const { gql } = require("apollo-server-express");

const typeDefs = gql`
    type GroupMessage {
        ID: String!
        groupID: String
        isForwarded: Boolean
        datetime: String!
        sender: User!
    }

    type User {
        image: String
        name: String!
        username: String!
    }

    type Friendship {
        datetime: String
        user: User
    }

    type FriendshipInvitation {
        ID: String!
        active: Boolean
        description: String
        datetime: String
        sender: User!
    }

    type Group {
        ID: String!
        description: String
        name: String!
        members: [User!]!
    }

    type GroupInvitation {
        ID: String!
        active: Boolean
        description: String
        datetime: String
        groupName: String
        groupID: String!
        sender: User!
    }

    type LoggedUser {
        friendships: [Friendship]
        friendshipInvitations: [FriendshipInvitation]
        groups: [Group!]
        groupsInvitations: [GroupInvitation!]
        image: String
        name: String!
        username: String!
    }

    type DirectMessage {
        ID: String!
        isForwarded: Boolean
        datetime: String!
        receiver: User!
        sender: User!
    }

    type  Query {
        directMessages(id: String!): [DirectMessage!]!
        groupMessages(id: String!): [GroupMessage!]!
        users: [LoggedUser!]!
        user(username: String!): LoggedUser!
    }

    input UserInput {
        image: String
        name: String!
        username: String!
    }

    type Mutation {
        registerUser(user: UserInput!): User!
        sendFriendshipInvitation(targetID: String!, description: String): FriendshipInvitation!
        sendDirectMessage(chatID: String!): DirectMessage!
        sendGroupMessage(groupID: String!): GroupMessage!
    }
`;

module.exports = { typeDefs };