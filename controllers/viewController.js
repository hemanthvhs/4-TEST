const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();
  // 2) Build Template -> This will not be done here
  // 3) Render the overview template using tour data from step-1
  res.status(200).render('overview', { title: 'All Tours', tours });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // Get the tour based on the asked slug & get the reviews & the user who created the review
  // In Tour model we have created a virtual schema for reviews
  // Inorder to make that virtual schema work we need to populate the reviews field using .populate()
  console.log(req.params.slug);
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  console.log(tour);
  if (!tour) {
    next(new AppError('There is no tour with that name', 404));
  }

  res.status(200).render('tour', { tour, title: tour.name });
  // To make sure that map box works set the Content Security Policy
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
  res
    .status(200)
    // .set(
    //   'Content-Security-Policy',
    //   "default-src 'self' https://*.unpkg.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://unpkg.com/axios/dist/axios.min.js 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
    // )
    .render('login', {
      title: 'Login into the application',
    });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'My Details',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) FIRST RETRIEVE ALL THE BOOKINGS BASED ON THE CURRENT USER ID
  const bookings = await Booking.find({ user: req.user.id });

  // 2) NOW GET THE TOUR ID & QUERY FOR TOUR INFO BASED ON THE BOOKING TOUR ID
  const tourIds = bookings.map((el) => el.tour._id);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
