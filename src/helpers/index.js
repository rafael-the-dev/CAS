const { ApolloError, ForbiddenError, UserInputError } = require("apollo-server-express")
const fs = require("fs");
const path = require("path")
const moment = require("moment");

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

const saveImage = async ({ folder, image }) => {
    const { createReadStream, filename } = await image;

    const { ext, name } = path.parse(filename);
    const time = moment().format("DDMMYYYY_HHmmss");
    const newName = `${name}_${time}${ext}`
    const imageFile = `images/${folder}/${newName}`;
    const stream = createReadStream();
    const pathName = path.join(path.resolve("."), `/public/images/${folder}/${newName}`);
    const out = fs.createWriteStream(pathName);
    await stream.pipe(out);

    return imageFile;
};

module.exports = { fetchData, fetchByID, hasAcess, hasDB, saveImage };