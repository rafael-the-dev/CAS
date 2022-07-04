const { UserInputError, ForbiddenError } = require("apollo-server-core");
const { hasDB } = require("../helpers/db")
const { saveImage } = require("../helpers")
const { dbConfig } = require("../connections");
const  { v4 } = require("uuid");
const { User } = require("./User");

class Post {
    static getPosts = async () => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const posts = await POSTS_DB.find({}).toArray();

        return posts;
    }

    static addComment = async ({ comment, id, pubsub, user }) => {
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

        post['comments'] = comments;

        pubsub.publish('POST_UPDATED', { postUpdated: { post, operation: "UPDATED" } }); 
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

    static deletePost = async ({ id, pubsub, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ author: username, ID: id });

        if(!post) throw new ForbiddenError("Post not found or you don't have permission to delete it.");

        await POSTS_DB.deleteOne({ author: username, ID: id });
        await User.removePost({ id, username });

        const result = { post, operation: "DELETED" };
        pubsub.publish('POST_UPDATED', { postUpdated: result });  

        return result;
    }

    static dislikePost = async ({ id, pubsub, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new ForbiddenError("Post not found or you don't have permission to delete it.");

        const likes = [ ...post.likes.filter(like => like.username !== username ) ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { likes }});

        const result = { post, operation: "UPDATED" };
        post['likes'] = likes;
        
        pubsub.publish('POST_UPDATED', { postUpdated: result });  

        return post;
    }

    static likePost = async ({ id, pubsub, username }) => {
        const POSTS_DB = hasDB({ dbConfig, key: "POSTS_DB" });

        const post = await POSTS_DB.findOne({ ID: id });

        if(!post) throw new ForbiddenError("Post not found or you don't have permission to delete it.");

        const likes = [ ...post.likes, { username } ];

        await POSTS_DB.updateOne({ ID: id }, { $set: { likes }});

        const result = { post, operation: "UPDATED" };
        post['likes'] = likes;

        pubsub.publish('POST_UPDATED', { postUpdated: result });  

        return post;
    }
}

module.exports = { Post }