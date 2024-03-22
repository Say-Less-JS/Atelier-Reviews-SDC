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


module.exports = {
  reviewSchema,
  reviewsMetaSchema
};