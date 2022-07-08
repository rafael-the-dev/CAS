const { User } = require("../../../models/User")
const { fetchData, fetchByID, hasDB } = require("../../../helpers");
const { dbConfig } = require("../../../connections");

const userResolver = {
    queries: {
        async loggedUser(_, args, { user }) {
            const result = await User.loggedUserDetails({ username: user.username });

            return result;
        },
        async user(_, { username }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const user = await fetchByID({ db, filter: { username }});

            return user;
        },
        async users() {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const list = await fetchData({ db, errorMessage: "", filter: {} });

            return list;
        }
    },
    mutations: {
        async registerUser(_, { user }) {
            const db = hasDB({ dbConfig, key: "USERS_DB" });

            const registedUser =  await db.findOne({ username: user.username });
            if(registedUser !== null ) throw new UserInputError("Username not available");
            const imageFile = user.image;

            let image;
            if(imageFile) {
                const { createReadStream, filename } = await imageFile;

                const { ext, name } = path.parse(filename);
                const time = moment().format("DDMMYYYY_HHmmss");
                const newName = `${name}_${time}${ext}`
                image = `images/users/${newName}`;
                const stream = createReadStream();
                const pathName = path.join(path.resolve("."), `/public/images/users/${newName}`);
                const out = fs.createWriteStream(pathName);
                await stream.pipe(out);
            }

            const hashedPassword = await bcrypt.hash(user.password, 10);
            const userToRegister = { 
                ...user, 
                datetime: Date.now().valueOf(),
                directMessages: [],
                friendships: [], 
                friendshipInvitations: [], 
                groups: [], 
                groupsInvitations: [],
                groupMessages: [],
                image,
                isOnline: false,
                password: hashedPassword
            };

            await db.insertOne(userToRegister);

            pubsub.publish('USER_CREATED', { userCreated: userToRegister }); 

            return userToRegister;
        }
    }
};

module.exports = { userResolver }