require('dotenv').config();
const path = require('path');
const express = require('express');
const model = require('./model.js');
const cacheMiddleware = require('../cacheMiddleware.js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, './public')));

app.get('/reviews/:productId',cacheMiddleware(30), (req, res) => {
  const { productId } = req.params;
  model.getReviews(productId)
  .then((reviews) => {
    res.send(reviews)
  })
  .catch((err) => {
    console.log(err);
    res.sendStatus(500);
  });
});

app.get('/metas/:productId', cacheMiddleware(30),(req, res) => {
  const { productId } = req.params;
  model.getMeta(productId)
  .then((meta) =>{
    res.send(meta)
  })
  .catch((err) => {
    console.log(err);
    res.sendStatus(500);
  })
})

app.post('/reviews', (req, res) =>{
  model.addReview(req.body)
  .then(() => res.sendStatus(201))
  .catch((err) =>{
    console.log(err);
    res.sendStatus(500);
  })
})

app.put('/reviews/:reviewId/helpful', (req, res) => {
  const { reviewId } = req.params;
  model.updateHelpful({_id: reviewId})
    .then(() => res.sendStatus(200))
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});

app.put('/reviews/:reviewId/report', (req, res) => {
  const { reviewId } = req.params;
  model.reportReview({_id: reviewId})
    .then(() => res.sendStatus(200))
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});

app.put('/metas/:productId', (req, res) =>{
  const { productId } = req.params;
  const updateData = req.body;
  model.updateMeta(productId, updateData)
    .then(() => {
      res.sendStatus(200);
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening at port: ${port}`);
});