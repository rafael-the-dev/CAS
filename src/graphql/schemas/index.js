const { gql } = require("apollo-server-express");

const typeDefs = gql`
    type User {
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

    type GroupMessage {
        ID: String!
        groupID: String
        isForwarded: Boolean
        datetime: String!
        sender: User!
    }

    type  Query {
        directMessages(id: String!): [DirectMessage!]!
        groupMessages(id: String!): [GroupMessage!]!
        users: [User!]!
        user(id: String!): User!
    }

    input UserInput {
        image: String
        name: String!
        username: String!
    }

    type Mutation {
        registerUser(user: UserInput!): User!
        sendDirectMessage(chatID: String!): DirectMessage!
        sendGroupMessage(groupID: String!): GroupMessage!
    }
`;

module.exports = { typeDefs };