const { gql } = require("apollo-server-express");

const typeDefs = gql`
    scalar Upload

    type File {
        filename: String!
        mimetype: String!
        encoding: String!
    }

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

    type UserDetails {
        friendships: [Friendship]
        friendshipInvitations: [FriendshipInvitation]
        groups: [Group!]
        groupsInvitations: [GroupInvitation!]
        image: File
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

    type AcessToken {
        expiresIn: Int!
        token: String!
    }

    type LoggedUser {
        acessToken: AcessToken!
        image: String
        name: String!
        username: String!
    }

    type  Query {
        directMessages(id: String!): [DirectMessage!]!
        groupMessages(id: String!): [GroupMessage!]!
        user(username: String!): UserDetails!
        users: [User!]!
    }

    input FileInput {
        filename: String!
        mimetype: String!
        encoding: String!
    }

    input UserInput {
        image: Upload
        name: String!
        password: String!
        username: String!
    }

    type Mutation {
        login(password: String!, username: String!): LoggedUser!
        registerUser(user: UserInput!): User!
        revalidateToken: AcessToken!
        validateToken(token: String!): LoggedUser!
        sendFriendshipInvitation(targetUsername: String!, description: String): FriendshipInvitation!
        sendDirectMessage(chatID: String!): DirectMessage!
        sendGroupMessage(groupID: String!): GroupMessage!
    }

    type Subscription {
        feedbackCreated: UserDetails
        feedbackDeleted: UserDetails
        feedbackUpdated(id: String!): UserDetails
    }
`;

module.exports = { typeDefs };