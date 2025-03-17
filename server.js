const { ApolloServer, gql } = require('apollo-server');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Directory where images are stored (now in public).
const imagesDir = path.join(__dirname, 'public', 'images');

// Get initial image data from environment variable, or default to empty array.
const imageDataString = process.env.IMAGE_DATA;
const initialImageData = imageDataString ? JSON.parse(imageDataString) : [];

let currentImageData = [...initialImageData];

// GraphQL type definitions.
const typeDefs = gql`
  type Image {
    id: ID!
    src: String!
    alt: String!
    likes: Int!
    isFeatured: Boolean!
  }

  type Query {
    images: [Image]
  }

  type Mutation {
    likeImage(id: ID!): Image
    markFeatured(id: ID!): Image
  }
`;

// GraphQL resolvers.
const resolvers = {
  Query: {
    // Resolver to get all images.
    images: () => {
      const images = fs.readdirSync(imagesDir).map((file, index) => {
        const imageData = currentImageData.find((img) => img.id === String(index + 1)) || { likes: 0, isFeatured: false };
        return {
          id: String(index + 1),
          src: `/images/${file}`,
          alt: file,
          likes: imageData.likes,
          isFeatured: imageData.isFeatured,
        };
      });
      return images;
    },
  },
  Mutation: {
    // Resolver to like or unlike an image.
    likeImage: (_, { id }) => {
      const imageIndex = currentImageData.findIndex((img) => img.id === id);
      if (imageIndex === -1) {
        currentImageData.push({ id, likes: 1, isFeatured: false });
      } else {
        currentImageData[imageIndex].likes = currentImageData[imageIndex].likes === 0 ? 1 : 0;
      }
      return resolvers.Query.images().find((img) => img.id === id);
    },
    // Resolver to mark or unmark an image as featured.
    markFeatured: (_, { id }) => {
      const imageIndex = currentImageData.findIndex((img) => img.id === id);
      if (imageIndex === -1) {
        currentImageData.push({ id, likes: 0, isFeatured: true });
      } else {
        currentImageData[imageIndex].isFeatured = !currentImageData[imageIndex].isFeatured;
      }
      return resolvers.Query.images().find((img) => img.id === id);
    },
  },
};

// Create Apollo Server instance.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  cors: {
    origin: 'https://esaote.netlify.app',
    credentials: true,
  },
});

// Start the server (Vercel will handle the port in serverless).
server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
