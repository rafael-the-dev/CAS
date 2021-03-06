const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server-express")
const bcrypt = require("bcrypt");

const { hasDB } = require("../helpers")
const { dbConfig } = require("../connections");
const { acessTokens } = require("../models/tokens")

const SECRET_KEY = '53a0d1a4174d2e1b8de701437fe06c08891035ed4fd945aef843a75bed2ade0657b3c4ff7ecd8474cb5180b2666c0688bbe640c9eb3d39bb9f2b724a10f343c6';
const { pubsub } = dbConfig;

class Acess {
    static login = async ({ password, username }) => {
        const usersDB = hasDB({ dbConfig, key: "USERS_DB" })

        const user = await usersDB.findOne({ username });
        if(user === null) throw new UserInputError("Username or password Invalid");
            
        if(await bcrypt.compare(password, user.password)) {
            const acessToken = jwt.sign({ name: user.name, username }, SECRET_KEY, { expiresIn: "25m" });
            const verifiedToken = jwt.verify(acessToken, SECRET_KEY);

            await usersDB.updateOne({ username }, { $set: { isOnline: true} })
            
            pubsub.publish('USER_CREATED', { userCreated: { ...user, isOnline: true } }); 

            return { acessToken: { expiresIn: verifiedToken.exp, token: acessToken }, image: user.image, name: user.name, username };
        } else {
            throw new UserInputError("Username or password Invalid");
        }

    }

    static logout = async ({ acessToken, user }) => {
        const tokens = [ ...acessTokens.INVALIDS_TOKENS ];
        acessTokens.INVALIDS_TOKENS = [ ...acessTokens.INVALIDS_TOKENS.filter(token => token !== acessToken) ];

        const db = hasDB({ dbConfig, key: "USERS_DB" });
        const username = user.username;

        await db.updateOne({ username }, { $set: { isOnline: false } })
        const savedUser = await db.findOne({ username });
        
        pubsub.publish('USER_CREATED', { userCreated: { ...savedUser } }); 

        return true;
    }

    static revalidateToken = ({ user }) => {
        const acessToken = jwt.sign({ name: user.name, username: user.username }, SECRET_KEY, { expiresIn: "25m" });
        
        const verifiedUser = jwt.verify(acessToken, SECRET_KEY);

        return { expiresIn: verifiedUser.exp, token: acessToken };
    }

    static validateToken = async ({ token }) => {
        const user = jwt.verify(token, SECRET_KEY);

        const db = hasDB({ dbConfig, key: "USERS_DB" });
        const username = user.username;

        await db.updateOne({ username }, { $set: { isOnline: true} })
        const savedUser = await db.findOne({ username });
        
        pubsub.publish('USER_CREATED', { userCreated: { ...savedUser } }); 

        return { acessToken: { expiresIn: user.exp, token }, image: savedUser.image, name: user.name, username: user.username };
    }
}

module.exports = { Acess }