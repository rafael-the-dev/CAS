const { gql } = require("apollo-server-express");

const typeDefs = gql`
    scalar Upload

    type File {
        filename: String!
        mimetype: String!
        encoding: String!
    }

    type Like {
        username: String!
    }

    type CommentReply {
        ID: String!
        comment: String! 
        createdAt: String!
        likes: [Like!]!
        replyingTo: String!
        username: String!
    }

    type Comment {
        ID: String!
        comment: String!
        createdAt: String!
        likes: [Like!]!
        replies: [CommentReply!]!
        username: String!
    }

    type Post {
        ID: String!
        author: String!
        createdAt: String!
        comments: [Comment!]!
        description: String!
        image: String
        likes: [Like!]!
        tags: [String!]!
    }

    type PostUpdate {
        operation: String!
        post: Post!
    }

    type IsRead {
        isRead: Boolean!
        username: String!
    }

    type GroupMessage {
        createdAt: String!
        ID: String!
        isDeleted: Boolean!
        isForwarded: Boolean!
        image: String
        isRead: [IsRead!]!
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
    
    type DirectChat {
        ID: String!
        datetime: String!
        messages: [DirectMessage!]!
        users: [String!]!
    }

    type FriendshipInvitation {
        ID: String!
        active: Boolean
        description: String
        datetime: String
        sender: User!
        target: User!
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
        friendshipInvitations: [FriendshipInvitation!]!
        groups: [Group!]
        groupsInvitations: [GroupsInvitation!]
        image: String
        isOnline: Boolean!
        name: String!
        username: String!
    }

    type LoggedUserDetails {
        directChats: [DirectChat!]!
        friendships: [User!]!
        friendshipInvitations: [FriendshipInvitation!]!
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
        loggedUser: LoggedUserDetails!
        posts: [Post!]!
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

    input PostInput {
        description: String!
        image: Upload
        tags: [String!]!
    }

    type Mutation {
        acceptFriendshipInvitation(id: String!): FriendshipInvitationStatus!
        acceptGroupInvitation(ID: String!, groupID: String!): Boolean
        addComment(comment: String!, id: String!): Post!
        addPost(postInput: PostInput!): Post!
        createGroup(group: GroupInput!): Group
        deleteDirectMessage(chatID: String!, destinatary: String!, messageID: String): DirectChat!
        deleteFriendship(username: String!): Boolean!
        deleteGroupMessage(groupID: String!, messageID: String): Group!
        deletePost(id: String!): PostUpdate!
        dislikeComment(commentID: String!, id: String!): Post
        dislikePost(id: String!): Post
        login(password: String!, username: String!): LoggedUser!
        logout: Boolean
        likeComment(commentID: String!, id: String!): Post
        leaveGroup(groupID: String!, isRemoved: Boolean!, removedUser: String!): Group!
        likePost(id: String!): Post
        registerUser(user: UserInput!): User!
        revalidateToken: AcessToken!
        validateToken(token: String!): LoggedUser!
        readMessage(chatID: String!): DirectChat!
        readGroupMessage(chatID: String!): Group!
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
        postAdded: Post!
        postUpdated: PostUpdate!
    }
`;

module.exports = { typeDefs };