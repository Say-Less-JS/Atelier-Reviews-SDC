require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
const { metaSchema, reviewSchema} = require('./db.js');

const Review = mongoose.model('Review', reviewSchema);
const Meta = mongoose.model('Meta', metaSchema)

const getReviews = (productId) => {
  return Review.find({ product_id: productId, reported: { $ne: true } });
}

const getMeta = (productId) => {
  return Meta.find({ product_id: productId });
}
const addReview = (reviewData) => {
  const newReview = new Review(reviewData);
  return newReview.save()
}

const updateHelpful = (review) => {
  return Review.updateOne({_id: review._id}, {
    $inc: { helpfulness: 1 }
  })
}

const reportReview = (review) => {
  return Review.updateOne({_id: review._id},{
    reported: true
  })
}

const updateMeta = (productId, newReviewData) => {
  const ratingUpdate = `ratings.${newReviewData.rating}`;
  const recommendUpdate = `recommended.${newReviewData.recommend ? 'true' : 'false'}`;

  return Meta.updateOne(
    { product_id: productId },
    {
      $inc: {
        [ratingUpdate]: 1,
        [recommendUpdate]: 1
      }
    }
  )
  .then(() => {
    const updatePromises = newReviewData.characteristics.map(char => {
      return Meta.findOneAndUpdate(
        { product_id: productId, 'characteristics.name': char.name },
        {
          $inc: {
            'characteristics.$.total': char.value,
            'characteristics.$.count': 1
          }
        },
        { new: true }
      )
      .then(updatedMeta => {
        // Find the updated characteristic
        const charToUpdate = updatedMeta.characteristics.find(c => c.name === char.name);
        // update the new average value
        const newValue = charToUpdate.total / charToUpdate.count;
        return Meta.updateOne(
          { product_id: productId, 'characteristics.$.name': char.name },
          { $set: { 'characteristics.$.value': newValue } }
        );
      });
    });

    return Promise.all(updatePromises);
  });
};

module.exports = {getReviews, getMeta, addReview, updateHelpful, reportReview, updateMeta};