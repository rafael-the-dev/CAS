const { createServer } = require('http');
const { ApolloServerPluginDrainHttpServer, UserInputError } = require("apollo-server-core");
const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const express = require('express');
const jwt = require('jsonwebtoken')
const SECRET_KEY = '53a0d1a4174d2e1b8de701437fe06c08891035ed4fd945aef843a75bed2ade0657b3c4ff7ecd8474cb5180b2666c0688bbe640c9eb3d39bb9f2b724a10f343c6';
const { graphqlUploadExpress } = require('graphql-upload');

const { typeDefs } = require("./graphql/schemas")
const { resolvers } = require("./graphql/resolvers")
const { createMongoDBConnection, dbConfig } = require("./connections");
const { acessTokens } = require("./models/tokens")

const PORT = process.env.PORT || 5000;

(async () => {
    if(!dbConfig.isConnected) {
        await createMongoDBConnection();
    }

    const app = express();
    const httpServer = createServer(app);

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const wsServer = new WebSocketServer({
        path: "/graphql",
        server: httpServer,
    });

    const serverCleanup = useServer({ schema }, wsServer);

    const context = async({ req }) => {
        const { operationName } = req.body;
        //console.log(operationName)
        let user = {};

        if(![ 'getPosts', 'getUsers', 'Login', 'CreateUser' ].includes(operationName)) {
            const acessToken = (req.headers && req.headers.authorization) || '';
            //console.log(acessToken)
            if(acessTokens.INVALIDS_TOKENS.includes(acessToken)) {
                throw new UserInputError("Invalid token");
            }

            user = { ...jwt.verify(acessToken, SECRET_KEY), acessToken }
        }

        return { user }
    };

    const server = new ApolloServer({ 
        context,
        schema,
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose()
                        }
                    }
                }
            }
        ]
    });


    await server.start();
    app.use(graphqlUploadExpress());
    server.applyMiddleware({ app });

    var options = {
        etag: true,
        //maxAge: 3600000, //in ms i.e 1 hr in this case
        redirect: true,
        setHeaders: function (res, path, stat) {
          //any other header in response
          res.set({
              'x-timestamp': Date.now(),
              'joseph' : 'hi',
              'Cache-Control' : (path.includes('index.html')) ? 'no-store' : 'public, max-age=3600000'
            });
        }
    }
    app.use(express.static("public", options));
    app.response.getHeaders()

    app.listen(4000, () => {
        console.log(`Server is now running on http://localhost:${PORT}${server.graphqlPath}`)
    });
    
    httpServer.listen(PORT, () => {
        console.log(`Server is now running on http://localhost:${PORT}${server.graphqlPath}`)
    });
})()