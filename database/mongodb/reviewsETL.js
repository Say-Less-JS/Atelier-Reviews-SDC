const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Import database models and schemas
const { reviewSchema } = require('./db.js');
const Review = mongoose.model('Review', reviewSchema);

// Connect to MongoDB
mongoose.connect('mongodb://localhost/reviews', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}).then(() => {
  console.log("Connected to MongoDB.");
}).catch(err => {
  console.error("Could not connect to MongoDB:", err);
});

// Function to process photos
const processPhotos = (photos) => {
  if (!photos) return [];
  return photos.map((photo) => ({ id: photo.id, url: photo.url }));
};

const photosByReviewId = {};

// Function to load data from CSV into memory
const loadData = (filePath, onEachRow) => {
  return new Promise((resolve, reject) => {
    const processStream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', onEachRow)
      .on('error', reject)
      .on('end', () => {
        console.log('CSV file processed successfully.');
        resolve();
      });
  });
};


const loadAllData = async() => {

  const photosPath = path.join(__dirname, '../../data/reviews_photos.csv');
    await loadData(photosPath, (row) => {
      if (!photosByReviewId[row.review_id]) {
        photosByReviewId[row.review_id] = [];
      }
      photosByReviewId[row.review_id].push({ id: parseInt(row.id), url: row.url });
    });
};


// Function to process reviews
const processReviews = async () => {
  const reviewBatchSize = 5000;
  let reviewBatch = [];
  let updatePromises = [];

  const reviewsPath = path.join(__dirname, '../../data/reviews.csv');
  const stream = fs.createReadStream(reviewsPath).pipe(csv());

  for await (const row of stream) {
    const reviewId = parseInt(row.id);
    const productId = parseInt(row.product_id);
    const photos = processPhotos(photosByReviewId[reviewId] || []);

    reviewBatch.push({
      product_id: productId,
      review_id: reviewId,
      rating: parseInt(row.rating),
      summary: row.summary,
      recommend: row.recommend === 'true',
      response: row.response,
      body: row.body,
      date: new Date(parseInt(row.date)),
      reviewer_name: row.reviewer_name,
      helpfulness: parseInt(row.helpfulness),
      photos: photos,
    });

        // Check if the batch size is reached and process the remaining
    if (reviewBatch.length >= reviewBatchSize) {
      await Review.insertMany(reviewBatch);
      console.log(`${reviewBatchSize} reviews inserted`);
      reviewBatch = [];
    }
  }

  if (reviewBatch.length > 0) {
    await Review.insertMany(reviewBatch);
    console.log('Last batch of reviews inserted');
  }

};


//ETL process for reviews
loadAllData().then(() => {
  console.log('All data loaded. Processing reviews...');
  processReviews().then(() => {
    console.log('All reviews processed.');
    mongoose.disconnect();
  }).catch(err => {
    console.error('An error occurred during the review processing:', err);
    mongoose.disconnect();
  });
}).catch(err => {
  console.error('An error occurred during data loading:', err);
  mongoose.disconnect();
});