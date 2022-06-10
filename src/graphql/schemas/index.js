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

    type GroupInvitation {
        createdAt: String!
        ID: String!
        sender: String!
        target: String!
    }

    type Group {
        ID: String!
        admin: String
        createdAt: String!
        description: String
        image: String
        name: String!
        invitations: [GroupInvitation!]!
        members: [String!]!
        messages: [GroupMessage!]!
    }

    type GroupsInvitation {
        ID: String!
        createdAt: String!
        name: String!
        groupID: String!
        sender: String!
    }

    type UserDetails {
        friendships: [Friendship]
        friendshipInvitations: [FriendshipInvitation]
        groups: [Group!]
        groupsInvitations: [GroupsInvitation!]
        image: String
        isOnline: Boolean!
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

    input GroupInvitationInput {
        groupID: String!
        target: String!
    }

    type Mutation {
        acceptFriendshipInvitation(id: String!): FriendshipInvitationStatus!
        acceptGroupInvitation(ID: String!, groupID: String!): Boolean
        createGroup(group: GroupInput!): Group
        deleteDirectMessage(chatID: String!, destinatary: String!, messageID: String): DirectChat!
        deleteGroupMessage(groupID: String!, messageID: String): Group!
        login(password: String!, username: String!): LoggedUser!
        logout: Boolean
        registerUser(user: UserInput!): User!
        revalidateToken: AcessToken!
        validateToken(token: String!): LoggedUser!
        readMessage(chatID: String!): DirectChat!
        rejectFriendshipInvitation(id: String!): FriendshipInvitationStatus!
        rejectGroupInvitation(ID: String!, groupID: String!): Boolean
        sendFriendshipInvitation(targetUsername: String!, description: String): FriendshipInvitation!
        sendDirectMessage(messageInput: DirectMessageInput!): DirectChat!
        sendGroupMessage(messageInput: GroupMessageInput!): Group!
        sendGroupInvitation(invitation: GroupInvitationInput!): Boolean!
    }

    type Subscription {
        feedbackCreated: UserDetails
        feedbackDeleted: UserDetails
        feedbackUpdated(id: String!): UserDetails
        groupUpdated(id: String!): Group!
        userCreated: UserDetails!
        userUpdated(username: String!): UserDetails!
        friendshipInvitationAccepted(id: String!): FriendshipInvitationStatus!
        friendshipInvitationSent(id: String!): FriendshipInvitation!
        messageSent(users: [String!]!): DirectChat
    }
`;

module.exports = { typeDefs };