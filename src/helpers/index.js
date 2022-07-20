const { ApolloError, ForbiddenError, UserInputError } = require("apollo-server-express")
const fs = require("fs");
const path = require("path")
const moment = require("moment");
const cloudinary = require('cloudinary').v2;

const fetchData = async ({ db, errorMessage, filter }) => {
    const result = await db.find(filter).toArray();;

    if(result === null) throw new UserInputError(errorMessage);
    
    return result;
};

const fetchByID = async ({ db, errorMessage, filter }) => {
    const result = await db.findOne(filter);
    
    if(result === null) throw new UserInputError(errorMessage);

    return result;
};

const hasDB = ({ dbConfig, key }) => {
    switch(key) {
        case "DIRECT_MESSAGES_DB": {
            return dbConfig.directMessagesDB;
        }
        case "FRIENDS_DB": {
            return dbConfig.friendsDB;
        }
        case "GROUPS_DB": {
            return dbConfig.groupsDB;
        }
        case "GROUP_MESSAGES_DB": {
            return dbConfig.groupMessagesDB;
        }
        case "USERS_DB": {
            return dbConfig.usersDB;
        }
        default: {
            throw new ApolloError("DB connection closed");
        }
    }
};

const hasAcess = ({ users, username }) => {
    if(!users.includes(username) ) throw new ForbiddenError("You dont't have access to this chat");
    return ;
};

const saveLocally = async ({ folder, image }) => {
    const { createReadStream, filename } = await image;

    const { ext, name } = path.parse(filename);
    const time = moment().format("DDMMYYYY_HHmmss");
    const newName = `${name}_${time}${ext}`
    const imageFile = `images/${folder}/${newName}`;
    const stream = createReadStream();
    const pathName = path.join(path.resolve("."), `/public/images/${folder}/${newName}`);

    return new Promise(async (resolve) => {
        const out = fs.createWriteStream(pathName);
        await stream.pipe(out);

        stream.on('close', () => { 
            resolve(pathName);
        });
    });
};

const uploadImage = async ({ imagePath }) => {
    // Use the uploaded file's name as the asset's public ID and
    // allow overwriting the asset with new versions
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    };

    try {
      // Upload the image
      const result = await cloudinary.uploader.upload(imagePath, options);
      console.log(result)
      return result.url;
    } catch (error) {
      console.error(error);
    }
};

const saveImage = async ({ folder, image }) => {
    const pathname = await saveLocally({ folder, image });
    const url = await uploadImage({ imagePath: pathname });

    fs.unlink(pathname, error => {
        if(error) console.error("error while deleting", error)
    });
    
    return url;
};

const deleteImage = async ({ url }) => {
    if(!Boolean(url) || typeof url !== "string") return;
    
    const { name } = path.parse(url);

    if(url.startsWith("http://") || url.startsWith("https://")) {
        new Promise(resolve => {
            cloudinary.uploader.destroy(name, result => {
                console.log(result);
                resolve(result)
            })
        })
    }
    
    const pathname = path.join(path.resolve("."), `/public/${url}`);

    fs.unlink(pathname, error => {
        if(error) console.error("error while deleting", error)
    });
    
    return;
};

module.exports = { deleteImage, fetchData, fetchByID, hasAcess, hasDB, saveImage };