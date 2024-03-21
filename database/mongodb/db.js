const mongoose = require('mongoose');

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


const reviewsMetaSchema = mongoose.Schema({
  product_id: Number,
  ratings: {
    '1': Number,
    '2': Number,
    '3': Number,
    '4': Number,
    '5': Number
  },
  recommended: {
    false: Number,
    true: Number
  },
  characteristics: [{
    name: String,
    id: Number,
    value: Number,
  }],
});


module.exports = {
  reviewSchema,
  reviewsMetaSchema
};