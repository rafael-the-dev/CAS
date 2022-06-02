const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server-express")
const bcrypt = require("bcrypt");

const { hasDB } = require("../helpers")
const { dbConfig } = require("../connections");

const SECRET_KEY = '53a0d1a4174d2e1b8de701437fe06c08891035ed4fd945aef843a75bed2ade0657b3c4ff7ecd8474cb5180b2666c0688bbe640c9eb3d39bb9f2b724a10f343c6';

class Acess {
    static login = async ({ password, username }) => {
        const usersDB = hasDB({ dbConfig, key: "USERS_DB" })

        const user = await usersDB.findOne({ username });
        if(user === null) throw new UserInputError("Username or password Invalid");
            
        if(await bcrypt.compare(password, user.password)) {
            const acessToken = jwt.sign({ name: user.name, username }, SECRET_KEY, { expiresIn: "15m" });
            const verifiedToken = jwt.verify(acessToken, SECRET_KEY);

            return { acessToken: { expiresIn: verifiedToken.exp, token: acessToken }, image: user.image, name: user.name, username };
        } else {
            throw new UserInputError("Username or password Invalid");
        }
    }

    static revalidateToken = ({ user }) => {
        const acessToken = jwt.sign({ name: user.name, username: user.username }, SECRET_KEY, { expiresIn: "15m" });
        
        const verifiedUser = jwt.verify(acessToken, SECRET_KEY);

        return { expiresIn: verifiedUser.exp, token: acessToken };
    }

    static validateToken = async ({ token }) => {
        const user = jwt.verify(token, SECRET_KEY);

        const db = hasDB({ dbConfig, key: "USERS_DB" });
        const savedUser = await db.findOne({ username: user.username });
        
        return { acessToken: { expiresIn: user.exp, token }, image: savedUser.image, name: user.name, username: user.username };
    }
}

module.exports = { Acess }