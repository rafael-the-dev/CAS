const { Post } = require("../../../models/Post")

const postsResolver = {
    queries: {
        async posts() {
            const result = await Post.getPosts();
            return  result;
        }
    },
    mutations: {
        async addComment(_, args, { user }) {
            const result  = await Post.addComment({ ...args, pubsub, user });
            return result;
        },
        async addCommentReply(_, args, { user }) {
            const result  = await Post.addCommentReply({ ...args, pubsub, username: user.username });
            return result;
        },
        async addPost(_, args, { user }) {
            const newPost  = await Post.addPost({ ...args, pubsub, user });
            return newPost;
        },
        async deletePost(_, args, { user }) {
            const result  = await Post.deletePost({ ...args, pubsub, username: user.username });
            return result;
        },
        async dislikeComment(_, args, { user }) {
            const result  = await Post.dislikeComment({ ...args, pubsub, username: user.username });
            return result;
        },
        async dislikeCommentReply(_, args, { user }) {
            const result  = await Post.dislikeCommentReply({ ...args, pubsub, username: user.username });
            return result;
        },
        async dislikePost(_, args, { user }) {
            const result  = await Post.dislikePost({ ...args, pubsub, username: user.username });
            return result;
        },
        async likeComment(_, args, { user }) {
            const result  = await Post.likeComment({ ...args, pubsub, username: user.username });
            return result;
        },
        async likeCommentReply(_, args, { user }) {
            const result  = await Post.likeCommentReply({ ...args, pubsub, username: user.username });
            return result;
        },
        async likePost(_, args, { user }) {
            const result  = await Post.likePost({ ...args, pubsub, username: user.username });
            return result;
        },
    }
};

module.exports = { postsResolver };