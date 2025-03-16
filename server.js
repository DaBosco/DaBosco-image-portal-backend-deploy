const { ApolloServer, gql } = require('apollo-server');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Directory where images are stored.
const imagesDir = path.join(__dirname, 'images');
// File to store image data (likes, featured status).
const imagesDataFile = path.join(__dirname, 'images-data.json');
// Directory where images are copied for public access.
const publicImagesDir = path.join(__dirname, 'public', 'images');

// Reset image data to an empty array on server startup.     CHANGE 1
// fs.writeFileSync(imagesDataFile, JSON.stringify([]));

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
                const imagesData = JSON.parse(fs.readFileSync(imagesDataFile));
                const imageData = imagesData.find((img) => img.id === String(index + 1)) || { likes: 0, isFeatured: false };
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
            const imagesData = JSON.parse(fs.readFileSync(imagesDataFile));
            const imageIndex = imagesData.findIndex((img) => img.id === id);
            if (imageIndex === -1) {
                // Image not found, create a new entry with 1 like.
                imagesData.push({ id, likes: 1, isFeatured: false });
            } else {
                // Image found, toggle likes (0 or increment).
                if (imagesData[imageIndex].likes > 0) {
                    imagesData[imageIndex].likes = 0;
                } else {
                    imagesData[imageIndex].likes++;
                }
            }
            //fs.writeFileSync(imagesDataFile, JSON.stringify(imagesData)); CHANGE 2
            return resolvers.Query.images().find((img) => img.id === id);
        },
        // Resolver to mark or unmark an image as featured.
markFeatured: (_, { id }) => {
    const imagesData = JSON.parse(fs.readFileSync(imagesDataFile));
    const imageIndex = imagesData.findIndex((img) => img.id === id);
    
    if (imageIndex === -1) {
        // Image doesn't exist in data file, create new entry
        imagesData.push({ id, likes: 0, isFeatured: true });
    } else {
        // Image exists, toggle featured status
        imagesData[imageIndex].isFeatured = !imagesData[imageIndex].isFeatured;
    }
    
    // Save changes to file
   // fs.writeFileSync(imagesDataFile, JSON.stringify(imagesData)); CHANGE 3
    
    // Return updated image data
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

// Create the /public/images directory if it doesn't exist.
if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'));
}
if (!fs.existsSync(path.join(__dirname, 'public', 'images'))) {
    fs.mkdirSync(path.join(__dirname, 'public', 'images'));
}

// Copy images from /images to /public/images.
fs.readdirSync(imagesDir).forEach((file) => {
    fs.copyFileSync(path.join(imagesDir, file), path.join(__dirname, 'public', 'images', file));
});
