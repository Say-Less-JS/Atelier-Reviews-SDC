const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/reviews');

const reviewSchema =  mongoose.Schema({
  product_id: Number,
  rating: Number,
  date: Date,
  summary: String,
  body: String,
  recommend: Boolean,
  reported: { type: Boolean, default: false },
  reviewer_name: String,
  reviewer_email: String,
  response: String,
  helpfulness: Number,
  photos: [
    {
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
    total: Number,
    count: Number,
    value: Number,
  }],
});

module.exports = {
  reviewSchema,
  metaSchema,
};

