const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// TRUSTING THE PROXIES - BUILT IN EXPRESS
app.enable('trust proxy'); // This is required because heroku uses proxy to our requests & inorder check that our app is secure means (https) we need to enable this setting. This makes sures that req.headers['x-forwarded-proto] is set to https

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // We can write as './views' but we should not use because sometime we may have different root folder so its better to use path

// SETTING SECURE HTTP HEADERS - HELMET

app.use(helmet());

// UPDATING THE CONTENT SECURITY POLICY
// REF : https://stackoverflow.com/a/30280371

const scriptSrcUrls = [
  'https://api.tiles.mapbox.com/',
  'https://api.mapbox.com/',
  'https://*.unpkg.com',
  'https://cdnjs.cloudflare.com',
  'https://js.stripe.com/v3/',
];
const styleSrcUrls = [
  'https://fonts.googleapis.com/',
  'https://*.tiles.mapbox.com',
  'https://api.mapbox.com/',
  'https://events.mapbox.com/',
];
const connectSrcUrls = [
  'https://*.tiles.mapbox.com',
  'https://api.mapbox.com/',
  'https://events.mapbox.com/',
  'https://*.unpkg.com',
  'https://cdnjs.cloudflare.com',
  'ws:',
  'https://js.stripe.com/v3/',
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const frameSrcurls = ['https://js.stripe.com/v3/'];
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", ...styleSrcUrls, "'unsafe-inline'"],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ['blob:'],
      frameSrc: ["'self'", frameSrcurls],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:'],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  })
);

// DEVLEOPMENT LOGGING MIDDLWARE - MORGAN

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// LIMITS REQUESTS - EXPRESS RATE LIMITER

const limiter = rateLimit({
  max: 100, // limt each IP to 100 requests per windowMS
  windowMs: 15 * 60 * 1000, // After 15 min, the count will be reseted
});

app.use(limiter);

// ADDING BODY PROPERTY TO THE REQUEST FROM BODY

app.use(express.json()); // app.use(express.json({ limit: '10kb' })); - Controls max request body size

// PARSING THE COOKIES FROM THE REQUEST & ADDING AS 'cookies' PROPERTY ON THE REQUEST

app.use(cookieParser());

// DATA SANITIZATION AGAINST NoSQL QUERY INJECTION - EXPRESS-MONGO-SANITITZE

app.use(mongoSanitize());

// DATA SANITIZATION AGAINST XSS ATTACKS

app.use(xss());

// PREVENT PARAMETER POLLUTION - HPP
// If we use hpp then - All the repeated parameters wil be removed from the req query.
// .../api/v1/tours?sort=-price&sort=-ratingsAverage this will be manipulated to .../api/v1/tours?sort=-ratingsAverage
// If we dont use hpp middleware - Then above query will result in error.
// Reason: .../api/v1/tours?sort=-price&sort=-ratingsAverage. Express req.query will be
// { sort: [-price, -ratingsAverage]}. We dont have a method that will handle an array. Therefore we need to pass as .../api/v1/tours?sort=-price,-ratingsAverage

// The something happens for filter conditions. Hence we will whitelist all of them.
// .../api/v1/tours?price[gte]=30&price

app.use(
  hpp({
    whitelist: [
      'duration',
      'price',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
    ],
  })
);

// SERVING STATIC FILES MIDDLEWARE

app.use(express.static(`${__dirname}/public`));

const myMiddleware = (req, res, next) => {
  console.log(req.cookies);
  req.middleware = 'Hi I am from middleware';
  next();
};

app.use(myMiddleware);

// COMPRESSIONG THE RESPONSE TEXT
app.use(compression());

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(
    new AppError(`Could not find the ${req.originalUrl} on this server !`, 404)
  );
});

// GLOBAL MIDDLWARE FUNCTION - EXPRESS PROVIDED (Whenever we pass error object in the next(), then express redirects directly to the global Error Handler function middlware)

app.use(globalErrorHandler);

module.exports = app;
