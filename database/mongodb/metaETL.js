const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Import database models and schemas
const { reviewsMetaSchema, reviewSchema } = require('./db.js');
const ReviewsMeta = mongoose.model('ReviewsMeta', reviewsMetaSchema);
const Review = mongoose.model('Review', reviewSchema);

// Connect to MongoDB
mongoose.connect('mongodb://localhost/reviews', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB.");
}).catch(err => {
  console.error("Could not connect to MongoDB:", err);
});

// Function to load data from CSV into memory, handling batches asynchronously
const loadData = (filePath, onEachBatch, batchSize = 5000) => {
   // Make the promise async to await onEachBatch
  return new Promise(async (resolve, reject) => {
    let batch = [];
    const stream = fs.createReadStream(filePath).pipe(csv());

    stream.on('data', (row) => {
      batch.push(row);
      if (batch.length >= batchSize) {
        stream.pause();
        onEachBatch(batch).then(() => {
          batch = [];
          stream.resume();
        }).catch(reject);
      }
    })
    .on('error', reject)
    .on('end', () => {
      if (batch.length > 0) {
        onEachBatch(batch).then(resolve).catch(reject);
      } else {
        resolve();
      }
    });
  });
};

const characteristicsById = {};

const loadCharsData = async () => {
  const charsPath = path.join(__dirname, '../../data/characteristics.csv');
  await loadData(charsPath, async (batch) => {
    for (let row of batch) {
      characteristicsById[row.id] = { name: row.name, product_id: parseInt(row.product_id) };
    }
  }, 5000);
};

const loadCharsReviewsData = async () => {
  const characteristics = [];
  const charReviewsPath = path.join(__dirname, '../../data/characteristic_reviews.csv');

  await loadData(charReviewsPath, async (batch) => {
    batch.forEach(row => {
      const reviewId = parseInt(row.review_id);
      const characteristic = characteristicsById[parseInt(row.characteristic_id)];
      const value = parseFloat(row.value);
      if (characteristic) {
        characteristics.push({
          review_id: reviewId,
          characteristic_id: parseInt(row.characteristic_id),
          product_id: characteristic.product_id,
          name: characteristic.name,
          value: value
        });
      }
    });
  }, 5000);

  return characteristics;
};



const updateReviewsMeta = async () => {
  const characteristics = await loadCharsReviewsData();

  // aggregation to compile the meta data.
  const pipeline = [
    {
      $group: {
        _id: "$product_id",
        ratings: {
          $push: {
            rating: "$rating",
            recommend: "$recommend"
          }
        }
      }
    }
  ];

  const reviewsAggregation = await Review.aggregate(pipeline);

  for (const product of reviewsAggregation) {
    const ratingsSummary = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let recommendedYes = 0;
    let recommendedNo = 0;

    for (const rating of product.ratings) {
      ratingsSummary[rating.rating] = (ratingsSummary[rating.rating] || 0) + 1;
      if (rating.recommend) {
        recommendedYes += 1;
      } else {
        recommendedNo += 1;
      }
    }

     // Calculate average characteristic values
     const charsForProduct = characteristics
     .filter(c => c.product_id === product._id)
     .reduce((acc, c) => {
       if (!acc[c.characteristic_id]) {
         acc[c.characteristic_id] = { sum: 0, count: 0, name: c.name };
       }
       acc[c.characteristic_id].sum += c.value;
       acc[c.characteristic_id].count += 1;
       return acc;
     }, {});

   const averagedChars = Object.keys(charsForProduct).map(key => {
     const { sum, count, name } = charsForProduct[key];
     return {
       id: parseInt(key),
       name,
       value: sum / count
     };
   });

    // Upsert the ReviewsMeta for product
    await ReviewsMeta.updateOne(
      { product_id: product._id },
      {
        $set: {
          ratings: ratingsSummary,
          recommended: { false: recommendedNo, true: recommendedYes },
          characteristics: averagedChars
        }
      },
      { upsert: true }
    );
  }
};

loadCharsData()
  .then(updateReviewsMeta)
  .then(() => {
    console.log('All reviewsmeta processed.');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('An error occurred:', err);
    mongoose.disconnect();
  });

