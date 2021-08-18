const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apifeatures');

exports.getAll = (Model) =>
  catchAsync(async (req, res) => {
    // console.log(req.middleware) - Logging our implemented custom middleware in app.js
    // console.log(req.query) - Object with all the query params
    // 1) FILTERING 2) SORTING 3) FIELDS LIMITING 4) Pagination

    let filter = {};
    if (req.params.tourID) filter = { tour: req.params.tourID }; // This is used only for getting all reviews based on the tourid

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // 5) EXECUTING QUERY

    const docs = await features.query;

    // 6) SEND RESPONSE

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        docs,
      },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);

    const docs = await query;

    if (!docs) {
      return next(new AppError('No docs found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      result: docs.length,
      data: {
        docs,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const docs = await Model.create(req.body); // req.body - all the necessary fields for the collection creation is taken & rest are ignored. Hence we can directly write as req.body

    res.status(201).json({
      status: 'success',
      data: {
        data: docs,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const docs = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!docs) {
      return next(new AppError('No docs found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: docs,
      },
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const docs = await Model.findByIdAndDelete(req.params.id);

    if (!docs) {
      return next(new AppError('No docs found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
