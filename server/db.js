const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/reviews');
const reviewSchema =  mongoose.Schema({
  product_id: Number,
  review_id: Number,
  rating: Number,
  summary: String,
  recommend: Boolean,
  response: String,
  body: String,
  date: Date,
  reviewer_name: String,
  helpfulness: Number,
  photos: [
    {
      id: Number,
      url: String
    }
  ]
});

const metaSchema = mongoose.Schema({
  product_id: Number,
  ratings: {
    '1': { type: Number, default: 0 },
    '2': { type: Number, default: 0 },
    '3': { type: Number, default: 0 },
    '4': { type: Number, default: 0 },
    '5': { type: Number, default: 0 }
  },
  recommended: {
    false: { type: Number, default: 0 },
    true: { type: Number, default: 0 }
  },
  characteristics: [{
    name: String,
    id: Number,
    value: Number,
  }],
});

const Review = mongoose.model('Review', reviewSchema);
const Meta = mongoose.model('Meta')
let getReviews = (productId) => {
  return Review.find({ product_id: productId });
}

let getMeta = (productId) => {
  return Meta.findOne({ product_id: productId });
}

let addReview = (reviewData) => {
  const { product_id, rating, summary, body, recommend, name: reviewer_name, photos } = reviewData;

  let review = new Review({product_id, rating, summary, body,recommend, reviewer_name,photos});
  return review.save();
};

let updateHelpful = (review) => {
  return Review.updateOne({_id: review._id}, {
    $inc: { helpfulness: 1 }
  })
}