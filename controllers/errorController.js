const AppError = require('../utils/appError');

// SENDING ERROR RESPOSNE - DEVELOPMENT ENVIRONMENT

const sendErrorsDev = (err, req, res) => {
  // 1) FOR API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // 2) FOR RENDERED WEBSITE
    console.log(err.message);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message,
    });
  }
};

// SENDING ERROR RESPOSNE - PRODUCTION ENVIRONMENT
// IF THERE IS AN OPERATIONAL ERROR -> SEND ERROR MESSAGE THAT TO THE CLIENT
// IF NOT AN OPERATIONAL ERROR -> SEND GENERIC MESSAGE
const sendErrorsProd = (err, req, res) => {
  // 1) FOR API
  console.log(err);
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    return res.status(err.statusCode).json({
      status: err.status,
      message: 'Something went wrong !',
    });
  }

  // 2) FOR RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message,
    });
  }

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: 'Try again later',
  });
};

// SETTING ERROR MESSAGES FOR DB - MAKING THEM OPERATIONAL ERRORS

const handleCastErrorDB = (err) =>
  new AppError(`Invalid ${err.path}-${err.value}`, 404);

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  let message = Object.values(err.errors).map((el) => el.message);
  message = `Invalid input data. ${message.join('. ')}`;

  return new AppError(message, 400);
};

// SETTING ERROR MESSAGES - JWT

const handleJWTError = () =>
  new AppError('Invalid token ! Please login again', 401);

const handleTokrnExpiredrror = () =>
  new AppError('Your token is expired ! Please login again', 401);

// GLOBAL ERROR HANDLER FUNCTION

module.exports = (err, req, res, next) => {
  //console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorsDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.assign(err);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleTokrnExpiredrror();
    sendErrorsProd(error, req, res);
  }
};
