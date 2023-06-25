const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Get the JWT secret key and expiration time from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;

const getUser = (token) => {
  try {
    if (token) {
      const user = jwt.verify(token, JWT_SECRET);
      console.log('User:', user);
      return user;
    }
    return null;
  } catch (err) {
    return null;
  }
};

const typeDefs = gql`
  type Query {
    posts: [Post!]!
  }

  type Mutation {
    createUser(username: String!, password: String!): User!
    loginUser(username: String!, password: String!): Token!
    createPost(title: String!, content: String!): Post!
    deletePost(id: ID!): Post!
    showUsers: [User!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
  }

  type User {
    id: ID!
    username: String!
  }

  type Token {
    token: String!
    user: User!
  }
`;

const users = [];
const authInfo = {}; // Object to store user and token

const resolvers = {
  Query: {
    posts: () => posts,
  },
  Mutation: {
    createPost: (parent, args, context) => {
      console.log(context);
      if (!authInfo.user) {
        throw new Error('Authentication required.');
      }

      const { title, content } = args;
      const newPost = {
        id: String(posts.length + 1),
        title,
        content,
      };
      posts.push(newPost);
      return newPost;
    },
    deletePost: (parent, args, context) => {
      if (!authInfo.user) {
        throw new Error('Authentication required.');
      }
      const { id } = args;
      const deletedPostIndex = posts.findIndex((post) => post.id === id);
      if (deletedPostIndex === -1) {
        throw new Error(`Post with ID ${id} not found.`);
      }
      const deletedPost = posts[deletedPostIndex];
      posts.splice(deletedPostIndex, 1);
      return deletedPost;
    },
    createUser: (parent, args, context) => {
      const { username, password } = args;
      if (!username) {
        throw new Error('Username is required.');
      }
      if (!password) {
        throw new Error('Password is required.');
      }
      const existingUser = users.find((user) => user.username === username);
      if (existingUser) {
        throw new Error('User already exists.');
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const newUser = {
        id: String(users.length + 1),
        username: username,
        password: hashedPassword,
      };
      users.push(newUser);
      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
      });
      authInfo.user = newUser; // Store the user in authInfo
      authInfo.token = token; // Store the token in authInfo
      return newUser;
    },

    loginUser: (parent, args, context) => {
      const { username, password } = args;
      const user = users.find((user) => user.username === username);
      if (!user) {
        throw new Error('User not found.');
      }
      const isValidPassword = bcrypt.compareSync(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid password.');
      }
      console.log('Valid password');
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
      });
      const userWithToken = { ...user }; 
      delete userWithToken.password;
      authInfo.user = userWithToken; // Store the user in authInfo
      authInfo.token = token; // Store the token in authInfo
      return {
        user: userWithToken,
        token,
      };
    },
    showUsers: (parent, args, context) => {
      return users;
    },
  },
};

const startServer = async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const token = req.headers.authorization || '';
      const user = getUser(token.replace('Bearer ', ''));
      return {
        user,
        token,
        authInfo, // Include authInfo in the context
      };
    },
  });

  await server.start();

  server.applyMiddleware({ app });

  app.listen({ port: 4000 }, () => {
    console.log('Server listening at http://localhost:4000/graphql');
  });
};

const posts = []; // Define posts array as a global variable

startServer();
