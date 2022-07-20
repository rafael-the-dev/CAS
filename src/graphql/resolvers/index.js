const { dbConfig } = require("../../connections");
const { ApolloError, UserInputError } = require("apollo-server-express")
const bcrypt = require("bcrypt");
const { PubSub, withFilter } = require('graphql-subscriptions');
const  { v4 } = require("uuid")
const jwt = require('jsonwebtoken');
const SECRET_KEY = '53a0d1a4174d2e1b8de701437fe06c08891035ed4fd945aef843a75bed2ade0657b3c4ff7ecd8474cb5180b2666c0688bbe640c9eb3d39bb9f2b724a10f343c6';
const fs = require("fs");
const path = require("path")
const { GraphQLUpload } = require('graphql-upload');
const moment = require("moment");
const { DirectChat } = require("../../models/DirectChat");
const { Acess } = require("../../models/Acess");
const { Friendship } = require("../../models/Friendship");
const { GroupChat } = require("../../models/GroupChat");
const { User } = require("../../models/User");
const { Post } = require("../../models/Post");


const { directChatResolver } = require("./models/directChat");
const { accessResolver } = require("./models/access");
const { friendshipsResolver } = require("./models/friendships");
const { groupChatResolver } = require("./models/groupChat");
const { userResolver } = require("./models/user");
const { postsResolver } = require("./models/post");

const { pubsub } = dbConfig;

const resolvers = {
    Upload: GraphQLUpload,
    Query: {
        ...accessResolver.queries,
        ...directChatResolver.queries,
        ...friendshipsResolver.queries,
        ...groupChatResolver.queries,
        ...postsResolver.queries,
        ...userResolver.queries
    },
    Mutation: {
        ...accessResolver.mutations,
        ...directChatResolver.mutations,
        ...friendshipsResolver.mutations,
        ...groupChatResolver.mutations,
        ...postsResolver.mutations,
        ...userResolver.mutations
    },
    Subscription: {
        feedbackCreated: {
            subscribe: () => pubsub.asyncIterator(['FEEDBACK_CREATED'])
        },
        feedbackDeleted: {
            subscribe: () => pubsub.asyncIterator(['FEEDBACK_DELETED'])
        },
        feedbackUpdated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['FEEDBACK_UPDATED']),
                (payload, variables) => {
                  // Only push an update if the comment is on
                  // the correct repository for this operation
                  //console.log(payload)
                  return (payload.feedbackUpdated.ID === variables.id || variables.id === "null");
                },
            ),
        },
        friendshipInvitationAccepted: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(["FRIENDSHIP_INVITATION_ACCEPTED"]),
                (payload, variables) => {
                    const isSender = payload.friendshipInvitationAccepted.sender.username === variables.id;
                    const isReceiver = payload.friendshipInvitationAccepted.receiver.username === variables.id;

                    return isSender || isReceiver;
                }
            )
        },
        friendshipInvitationSent: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(["FRIENDSHIP_INVITATION_SENT"]),
                (payload, variables) => payload.friendshipInvitationSent.id === variables.id
            )
        },
        groupUpdated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(["GROUP_UPDATED"]),
                (payload, variables) => payload.groupUpdated.ID === variables.id
            )
        },
        messageSent: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['MESSAGE_SENT']),
                (payload, variables) => {
                    const sender = payload.messageSent.sender;
                    const destinatary = payload.messageSent.destinatary;

                    const hasDestinatary = variables.users.includes(destinatary);
                    const hasSender = variables.users.includes(sender);
                    const w = variables.users[0] === destinatary && variables.users[1] === destinatary;
                    
                    return (hasDestinatary && hasSender) || w ;
                }
            ),
        },
        notification: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['NOTIFICATION']),
                (payload, variables) => payload.notification.target === variables.username
            ),
        },
        postAdded: {
            subscribe: () => pubsub.asyncIterator(['POST_ADDED'])
        },
        postUpdated: {
            subscribe: () => pubsub.asyncIterator(['POST_UPDATED'])
        },
        userCreated: {
            subscribe:() => pubsub.asyncIterator(["USER_CREATED"])
        },
        userUpdated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['USER_UPDATED']),
                (payload, variables) => payload.userUpdated.username === variables.username
            ),
        },
        updatedPost: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['UPDATED_POST']),
                (payload, variables) => {
                    return payload.updatedPost.ID === variables.id;
                }
            )
        },
    }
};

module.exports = { resolvers };