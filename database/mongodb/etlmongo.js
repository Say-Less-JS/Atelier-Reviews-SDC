const { reviewSchema, reviewsMetaSchema } = require('./db.js');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

mongoose.connect('mongodb://localhost/reviews', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}).then(() => {
  console.log("Connected to MongoDB.");
}).catch(err => {
  console.error("Could not connect to MongoDB:", err);
});

const Review = mongoose.model('Review', reviewSchema);
const ReviewsMeta = mongoose.model('ReviewsMeta', reviewsMetaSchema);

const characteristicsById = {};
const charReviewsByReviewId = {};
const photosByReviewId = {};

// Helper functions
const processPhotos = (photos) => photos.map((photo) => ({ id: photo.id, url: photo.url }));

// Function to load data from CSV into memory
const loadData = (filePath, onEachRow) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', onEachRow)
      .on('end', resolve)
      .on('error', reject);
  });
};

// Load all CSV files
const loadAllData = async() => {
  const characteristicsCsvPath = path.join(__dirname, '../../data/characteristics.csv');
  await loadData(characteristicsCsvPath, (row) => {
    characteristicsById[row.id] = { name: row.name, product_id: parseInt(row.product_id) };
  });

  const characteristicReviewsPath = path.join(__dirname, '../../data/characteristic_reviews.csv');
  await loadData(characteristicReviewsPath, (row) => {
    if (!charReviewsByReviewId[row.review_id]) {
      charReviewsByReviewId[row.review_id] = [];
    }
    charReviewsByReviewId[row.review_id].push({ characteristic_id: parseInt(row.characteristic_id), value: Number(row.value) });
  });

  const photosPath = path.join(__dirname, '../../data/reviews_photos.csv');
  await loadData(photosPath, (row) => {
    if (!photosByReviewId[row.review_id]) {
      photosByReviewId[row.review_id] = [];
    }
    photosByReviewId[row.review_id].push({ id: parseInt(row.id), url: row.url });
  });
};

// sum characteristics for the ReviewsMeta
const sumChars = (charReviewsByReviewId, characteristicsById) => {
  const summarizedChars = {};

  for (const reviewId in charReviewsByReviewId) {
    charReviewsByReviewId[reviewId].forEach((charReview) => {
      const characteristic = characteristicsById[charReview.characteristic_id];
      const productId = characteristic.product_id;
      if (!summarizedChars[productId]) {
        summarizedChars[productId] = {};
      }
      if (!summarizedChars[productId][characteristic.name]) {
        summarizedChars[productId][characteristic.name] = {
          id: charReview.characteristic_id,
          value: 0,
          count: 0
        };
      }
      summarizedChars[productId][characteristic.name].value += charReview.value;
      summarizedChars[productId][characteristic.name].count++;
    });
  }

  // Convert the aggregated counts to averages and format for update
  const characteristicsUpdate = {};
  for (const productId in summarizedChars) {
    characteristicsUpdate[productId] = [];
    for (const charName in summarizedChars[productId]) {
      const char = summarizedChars[productId][charName];
      characteristicsUpdate[productId].push({
        id: char.id,
        name: charName,
        value: char.value / char.count
      });
    }
  }

  return characteristicsUpdate;
};

// Process reviews after all data is loaded
const processReviews = async () => {
  const REVIEW_BATCH_SIZE = 5000;
  let reviewBatch = [];
  let reviewsMetaUpdates = {};

  const reviewsPath = path.join(__dirname, '../../data/reviews.csv');
  const stream = fs.createReadStream(reviewsPath).pipe(csv());

  stream.on('data', (row) => {
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

    // Check if the batch size is reached and process accordingly
    if (reviewBatch.length >= REVIEW_BATCH_SIZE) {
      // Process the review batch
      Review.insertMany(reviewBatch)
        .then(() => console.log(`${REVIEW_BATCH_SIZE} reviews inserted`))
        .catch(err => console.error('Error inserting review batch:', err));

      // Reset review batch
      reviewBatch = [];
    }
  });

  stream.on('end', async () => {
    // Process the remaining reviews if there are any left
    if (reviewBatch.length > 0) {
      await Review.insertMany(reviewBatch)
        .then(() => console.log('Last batch of reviews inserted'))
        .catch(err => console.error('Error inserting last batch of reviews:', err));
    }

    // Aggregate characteristics for ReviewsMeta
    const characteristicsUpdate = sumChars(charReviewsByReviewId, characteristicsById);

    // Update the ReviewsMeta for each product
    for (const productId in characteristicsUpdate) {
      const filter = { product_id: parseInt(productId) };
      const update = {
        $set: { characteristics: characteristicsUpdate[productId] }
      };
      const options = { upsert: true, new: true, setDefaultsOnInsert: true };

      await ReviewsMeta.findOneAndUpdate(filter, update, options)
        .catch(error => console.error('Error updating ReviewsMeta for product:', productId, error));
    }

    console.log('All ReviewsMeta documents updated.');
    mongoose.disconnect();
  });

  stream.on('error', err => {
    console.error('Stream encountered an error:', err);
    mongoose.disconnect();
  });
};

// Run ETL process
loadAllData().then(() => {
  console.log('All data loaded. Processing reviews...');
  processReviews().then(() => {
    console.log('ETL process completed.');
  }).catch(err => {
    console.error('An error occurred during the ETL process:', err);
    mongoose.disconnect();
  });
}).catch((err) => {
  console.error('Error loading data:', err);
});
