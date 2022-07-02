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

        return { post, operation: "DELETED" };
    }
}

module.exports = { Post }