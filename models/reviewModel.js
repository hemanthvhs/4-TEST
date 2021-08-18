const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      // This is setter function. Whenever we set a value to the rating field then set function is called where value is passed.
      set: (val) => Math.round(val * 10) / 10, // This is a trick to round of value Math.round(4.666) is 5 but we want output to be 4.6 for that reason we use (4.66 * 10) = 46/10 = 4.6
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Setting the schema options for virtuals importance
// As we know virtuals are never persisted in DB. We make some calculations based on the
// other fields & inorder to show them in output or resposne then we need to set
// the schema options as mentioned above

// COMPOUND INDEX
// This means that there should be unique tour and user. Implies there cannot be multiple documents with same tour and same user
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// QUERY MIDDLEWARE - FOR PARENT REFERENCING TOURS & USERS

reviewSchema.pre(/^find/, function (next) {
  // this refers to the query & populate is a method on query not the document. Hence we will use query middleware pre hook
  this.populate([
    //{ path: 'tour', select: 'name' },
    { path: 'user', select: '-__v' },
  ]);
  next();
});

// STATIC METHODS
// Our ultimate aim is to update the Tours ratings & ratings average based on the
// number of reviews for that particular tour & average ratings for that particular tour
// Whenever new review is created, this statics method is called & will fins the number of ratings & average & updates the tour document of ratings & average ratings
reviewSchema.statics.calcRatingsAverage = async function (tourID) {
  // this refers to the model. Aggregate is performed on model only
  const stats = await this.aggregate([
    { $match: { tour: tourID } },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // Once the stats are calculated for a tourID we need to update these stats for the Tour model
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourID, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // If there are no existing reviews for a tour ID then default the quantity to  0 and average to 4.5
    await Tour.findByIdAndUpdate(tourID, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Invoking the calcRatingsAverage when review is created.
reviewSchema.post('save', function () {
  // We are calling our static function calcRatingsAverage
  // this.tour is the tourID
  // this.constructor => Model (Since statics is always callend on model) we need to call calcRatingsdAverage() on the model
  // In post save document middleware "this" refers to the document. Now "this.constructor" is the model
  // But this is the post save document middleware & hence this refers to the document.
  // We cannot use reviewSchema.calcRatingsAverage() because this is on schema but statics is called only on model
  // We can move this middleware to line after 85 (after Review model creation) but this method is never part of the model because after creation of model we are creating this middleware.
  // Hence we have used this.constructor which is the model (workaround)
  this.constructor.calcRatingsAverage(this.tour);
});

// Invoking the calcRatingsAverage when review is updated or deleted.
reviewSchema.post(/^findByID/, function (doc) {
  doc.constructor.calcRatingsAverage(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
