const { UserInputError } = require("apollo-server-core");
const { fetchData, fetchByID, hasDB } = require("../helpers")
const { dbConfig } = require("../connections");
const  { v4 } = require("uuid");
const { User } = require("./User");

class Post {
    static addPost = async ({ postInput, user }) => {
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

        return newPost;
    }
}

module.exports = { Post }