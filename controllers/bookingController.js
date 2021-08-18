const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handleFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) GET THE INFO FOR THE CURRENTLY BOOKING TOUR BASED ON THE ID PASSED
  const tour = await Tour.findById(req.params.tourId);
  // 2) CREATE A CHECKOUT SESSION
  // BELOW REFERENCES KNOWLEDGE IS REQUIRED INORDER TO UNDERSTAND CREATING THE CHECKOUT SESSION
  // REF - https://stripe.com/docs/api/checkout/sessions/create?lang=node
  // REF - https://stripe.com/docs/payments/accept-a-payment
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'inr',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
      },
    ],
  });
  // 3) SEND THIS CHECKOUT SESSION AS A RESPONSE
  res.status(200).json({
    status: 'success',
    session,
  });
});

// Once user successfully done with the checkout then we will redirect the user to the all tours page.
// Also we need to create the booking info in the DB.
// For that we can render a separate checkout page & render it to the UI but that is not required.
// Here we will do a hack where we will remove query params from the url & pass the plain url without query params
// If user comes to know about the query params then he can easily create a booking wihtout paying
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();

  await Booking.create({ tour, user, price });

  res.redirect(`${req.protocol}://${req.get('host')}/`);
});

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
