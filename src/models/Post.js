const { UserInputError, ForbiddenError } = require("apollo-server-core");
const { hasDB } = require("../helpers/db")
const { saveImage } = require("../helpers")
const { dbConfig } = require("../connections");
const  { v4 } = require("uuid");
const { User } = require("./User");

const { pubsub } = dbConfig;

class Post {
    static getPost = async ({ id }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });
        
        return post;
    }

    static getPosts = async () => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const posts = await POSTS_DB.find({}).toArray();

        return posts;
    }

    static addComment = async ({ comment, id, user }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new UserInputError("Post not found.");

        const ID = v4();
        const newComment = { 
            comment, 
            ID, 
            createdAt: Date.now().toString(),
            likes: [],
            replies: [],
            username: user.username
        };

        const comments = [ newComment, ...post.comments ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { comments } });

        post['comments'] = comments;//

        pubsub.publish('POST_UPDATED', { postUpdated: { post, operation: "UPDATED" } }); 
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 
        return post;
    }

    static addCommentReply = async ({ comment, commentID, id, replyingTo, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new UserInputError("Post not found.");

        const comments = [ ...post.comments ];
        const commentResult = comments.find(currentComment => currentComment.ID === commentID);

        if(!commentResult) throw new UserInputError("Comment id not found");

        const reply = {
            ID: v4(),
            comment, 
            createdAt: Date.now().toString(),
            likes: [],
            replyingTo,
            username
        };

        commentResult['replies'] = [ ...commentResult.replies, reply ]

        await POSTS_DB.updateOne({ ID: id }, { $set: { comments }});

        post['comments'] = comments;
        const result = { post, operation: "UPDATED" };

        pubsub.publish('POST_UPDATED', { postUpdated: result });  
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 

        return post;
    }

    static addPost = async ({ pubsub, postInput, user }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const { image, description, tags } = postInput;

        if(!Boolean(description) && !Boolean(image)) throw new UserInputError("Empty post");

        let imageFile;
        if(image) {
            imageFile = await saveImage({ folder: "posts", image })
        }

        const ID = v4();
        const username = user.username;

        const newPost = {
            author: username,
            createdAt: Date.now().toString(),
            comments: [],
            description,
            ID,
            image: imageFile,
            likes: [],
            tags
        };

        await POSTS_DB.insertOne(newPost);
        await User.addPost({ ID, username });

        pubsub.publish('POST_ADDED', { postAdded: { ...newPost } }); 

        return newPost;
    }

    static deletePost = async ({ id, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ author: username, ID: id });

        if(!post) throw new ForbiddenError("Post not found or you don't have permission to delete it.");

        await POSTS_DB.deleteOne({ author: username, ID: id });
        await User.removePost({ id, username });

        const result = { post, operation: "DELETED" };
        pubsub.publish('POST_UPDATED', { postUpdated: result });  

        return result;
    }

    static dislikeComment = async ({ commentID, id, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new UserInputError("Post not found.");

        const comments = [ ...post.comments ];
        const comment = comments.find(currentComment => currentComment.ID === commentID);

        if(!comment) throw new UserInputError("Comment id not found");

        comment['likes'] = [ ...comment.likes.filter(like => like.username !== username) ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { comments }});
        
        post['comments'] = comments;
        const result = { post, operation: "UPDATED" };

        pubsub.publish('POST_UPDATED', { postUpdated: result });  
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 

        return post;
    }

    static dislikeCommentReply = async ({ commentID, id, replyID, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new UserInputError("Post not found.");

        const comments = [ ...post.comments ];
        const comment = comments.find(currentComment => currentComment.ID === commentID);

        if(!comment) throw new UserInputError("Comment id not found");

        const reply = comment.replies.find(currentReply => currentReply.ID === replyID);
        if(!reply) throw new UserInputError("Invalid reply id.");

        reply['likes'] = [ ...reply.likes.filter(currentLike => currentLike.username !== username) ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { comments }});

        post['comments'] = comments;
        const result = { post, operation: "UPDATED" };

        pubsub.publish('POST_UPDATED', { postUpdated: result });  
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 

        return post;
    }

    static dislikePost = async ({ id, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new ForbiddenError("Post not found or you don't have permission to delete it.");

        const likes = [ ...post.likes.filter(like => like.username !== username ) ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { likes }});

        const result = { post, operation: "UPDATED" };
        post['likes'] = likes;
        
        pubsub.publish('POST_UPDATED', { postUpdated: result });  
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 

        return post;
    }

    static likeComment = async ({ commentID, id, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new UserInputError("Post not found.");

        const comments = [ ...post.comments ];
        const comment = comments.find(currentComment => currentComment.ID === commentID);

        if(!comment) throw new UserInputError("Comment id not found");

        comment['likes'] = [ ...comment.likes, { username }]

        await POSTS_DB.updateOne({ ID: id }, { $set: { comments }});

        post['comments'] = comments;
        const result = { post, operation: "UPDATED" };

        pubsub.publish('POST_UPDATED', { postUpdated: result });  
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 

        return post;
    }

    static likeCommentReply = async ({ commentID, id, replyID, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new UserInputError("Post not found.");

        const comments = [ ...post.comments ];
        const comment = comments.find(currentComment => currentComment.ID === commentID);

        if(!comment) throw new UserInputError("Comment id not found");

        const reply = comment.replies.find(currentReply => currentReply.ID === replyID);
        if(!reply) throw new UserInputError("Invalid reply id.");

        reply['likes'] = [ ...reply.likes, { username } ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { comments }});

        post['comments'] = comments;
        const result = { post, operation: "UPDATED" };

        pubsub.publish('POST_UPDATED', { postUpdated: result });  
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 

        return post;
    }

    static likePost = async ({ id, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new ForbiddenError("Post not found or you don't have permission to delete it.");

        const likes = [ ...post.likes, { username } ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { likes }});

        const result = { post, operation: "UPDATED" };
        post['likes'] = likes;
        
        pubsub.publish('POST_UPDATED', { postUpdated: result });  
        pubsub.publish('UPDATED_POST', { updatedPost: { ...post } }); 

        return post;
    }
}

module.exports = { Post }