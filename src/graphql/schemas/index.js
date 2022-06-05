const { gql } = require("apollo-server-express");

const typeDefs = gql`
    scalar Upload

    type File {
        filename: String!
        mimetype: String!
        encoding: String!
    }

    type GroupMessage {
        createdAt: String!
        ID: String!
        isDeleted: Boolean!
        isForwarded: Boolean!
        image: String
        isRead: Boolean!
        reply: DirectMessage
        sender: String!
        text: String
    }

    type User {
        image: String
        isOnline: Boolean
        name: String!
        username: String!
    }

    type Friendship {
        ID: String!
        datetime: String!
        user: User!
    }

    type FriendshipInvitation {
        ID: String!
        active: Boolean
        description: String
        datetime: String
        sender: User!
    }

    type FriendshipInvitationStatus {
        ID: String!
        receiver: User!
        status: String!
        sender: User!
    }

    type Group {
        ID: String!
        admin: String
        createdAt: String!
        description: String
        image: String
        name: String!
        members: [User!]!
        messages: [GroupMessage!]!
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

    type ReplyMessage {
        createdAt: Int!
        ID: String!
        image: String
        sender: String!
        text: String
    }

    type DirectMessage {
        createdAt: String!
        ID: String!
        isDeleted: Boolean!
        isForwarded: Boolean!
        image: String
        isRead: Boolean!
        reply: DirectMessage
        sender: String!
        text: String
    }

    
    type DirectChat {
        ID: String!
        datetime: String!
        messages: [DirectMessage!]!
        users: [String!]!
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
        directChat(id: String, dest: String): DirectChat!
        directChats: [DirectChat!]!
        directMessages(id: String!): [DirectMessage!]!
        friendships: [User!]!
        friendshipInvitations: [FriendshipInvitation!]!
        groupMessages(id: String!): [GroupMessage!]!
        group(ID: String!): Group!
        groups: [Group!]!
        user(username: String!): User!
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

    input DirectMessageInput {
        chatID: String!
        destinatary: String!
        image: Upload
        isForwarded: Boolean!
        reply: String
        text: String
    }

    input GroupMessageInput {
        groupID: String!
        image: Upload
        isForwarded: Boolean!
        reply: String
        text: String
    }

    input GroupInput {
        description: String
        name: String!
    }

    type Mutation {
        acceptFriendshipInvitation(id: String!): FriendshipInvitationStatus!
        createGroup(group: GroupInput!): Group
        deleteDirectMessage(chatID: String!, destinatary: String!, messageID: String): DirectChat!
        login(password: String!, username: String!): LoggedUser!
        logout: Boolean
        registerUser(user: UserInput!): User!
        revalidateToken: AcessToken!
        validateToken(token: String!): LoggedUser!
        readMessage(chatID: String!): DirectChat!
        rejectFriendshipInvitation(id: String!): FriendshipInvitationStatus!
        sendFriendshipInvitation(targetUsername: String!, description: String): FriendshipInvitation!
        sendDirectMessage(messageInput: DirectMessageInput!): DirectChat!
        sendGroupMessage(messageInput: GroupMessageInput!): Group!
    }

    type Subscription {
        feedbackCreated: UserDetails
        feedbackDeleted: UserDetails
        feedbackUpdated(id: String!): UserDetails
        userCreated: User!
        friendshipInvitationAccepted(id: String!): FriendshipInvitationStatus!
        friendshipInvitationSent(id: String!): FriendshipInvitation!
        messageSent(users: [String!]!): DirectChat
    }
`;

module.exports = { typeDefs };