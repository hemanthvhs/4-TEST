const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 // COnverting 90days to milliseconds
    ),
    httpOnly: true, // This means that this cookie cannot be accessed by client side javascript to manipulate or access
  };

  // Here we want cookie to be sent on a secure connection which is HTTPS
  // Though we have set our NODE_ENV to production that doesn't always means that we are using HTTPS
  // Therefore other way is, express adds a property on the request called 'secure' & set that to true if we are using HTTPS. To access that use req.secure
  // But this doesn't work in heroku because heroku first proxies our request & then sends that to the express.
  // To make work on heroku also we need to use req.headers[x-forwared-proto] === 'https'

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // For development secure will be false by default.

  if (req.secure || req.headers['x-forwared-proto'] === 'https')
    cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined; // Since user contains password property. We are removing it.

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const reqObj = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    role: req.body.role,
  };
  const newUser = await User.create(reqObj);

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // 1) CHECK IF BODY CONTAINS EMAIL AND PASSWORD

  const { email, password } = req.body;
  if (!email || !password) {
    next(new AppError('Please provide email & password', 400));
  }
  // 2) CHECK IF USER IS AVAILABLE IN DB AS PER EMAIL PROVIDED
  // If user deletes himself by using the route /deleteMe, then active will be set to false
  // We have a pre hook query middleware which will run before executing the await User.findOne({ email }).select('+password')
  // And removes all the inactive users (Refer the query middleware in userModel)
  const user = await User.findOne({ email }).select('+password');

  // 3) VALIDATE THE PASSWORD SENT BY THE USER & ACTUAL PASSWORD
  // user.checkPassowrd() is an instance method which will be available on each user document. Logic written in userModel
  if (!user || !(await user.checkPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, req, res);
});

// Approach - 1: For logout we simply send the invalid jwt since the cookie cannot be altered or deleted using js code in the browser
// Approach - 2: Clearing the cookie with jwt
exports.logout = (req, res, next) => {
  res.clearCookie('jwt');
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Check if req header contains authorization header & that header starts with Bearer
  // If there is not authorization header then check if the req has got cookies

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(
        'You are not logged in ! Please login to get the access',
        401
      )
    );
  }

  // 2) Verifying the token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user is available in DB for the token provided

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(
      new AppError(
        'The user belonging to that token, does no longer exist',
        401
      )
    );
  }

  // 4) Check if user has changed the password after token is issued

  if (user.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again', 401)
    );
  }

  req.user = user;
  res.locals.user = user; // Making the user object accessible to the PUG templates
  next();
});

// This controller is used for conditional display of Login / Logout buttons in the header pug template
// If user is logged in then we display Logout and User Info in header pug template
// If user is not logged in then we display login and signup in header pug template
// This will run only for the rendered pages & we will not throw any errors
// This will be similar to protect controller except the fact that we use this for rendered pages
// Here since we are not catching any errors we dont use catchAsync as well.
// Lets suppose jwt is malformed and since we are verfying the jwt signature then it throws error and catchAsync catches that & sends the response automatically to the client side. Hence to prevent that we dont use catchAsync
// Eg: Once user logged out we are manually setting the cookie jwt to "loggedout" & forcing the user to go the all tours page. While rendering the page we have a middleware isLoggedin which checks the user authentication & updates the headers. So Here JWT verification is being done
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  // If there is cookie & jwt is present then do the further checks
  if (req.cookies.jwt) {
    const token = req.cookies.jwt;

    // 2) Verifying the token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user is available in DB for the token provided

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(); // Not throwing any error simply calling the next middleware
    }

    // 4) Check if user has changed the password after token is issued

    if (user.changedPasswordAfter(decoded.iat)) {
      return next(); // Not throwing any error simply calling the next middleware
    }

    // 5) If the control is in this line this means that all the above checks are passed and now we need to make sure that our header pug template should have access to this user info
    // Inorder to access user object in pug templates we use the below format

    res.locals.user = user; // Another way of passing the variables/objects/info to the pug templates
    return next();
  }

  next(); // If the control is here this means that either there is not cookie with jwt
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // ...roles = ['admin', 'lead-guide'].  Generally by defualt user is the role if not specified
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permissions to perform this action', 403)
      );
    }

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Check if email exists in the req body & check if user for that email exists in DB.

  if (!req.body.email) {
    return next(
      new AppError(
        'Please provide your email inorder to reset the password',
        400
      )
    );
  }

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }

  // 2) Generate the password reset token

  const resetToken = await user.createPasswordResetToken();
  console.log(resetToken);
  await user.save({ validateBeforeSave: false }); // Since in the instance method we are setting the passwordResetToken & Date for the doucment & hence it needs to be saved in DB

  // 3) Send the reset token to users email

  // const message = `Forgot your password ? Submit a PATCH request with your password and passwordConfirm to ${resetURL}.\nIf you did not forget your password, please ignore this email`;

  // const mailOptions = {
  //   email: user.email,
  //   subject: 'Your Password Reset Token (Valid for 10 Min)',
  //   message,
  // };

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email! Please try again later',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Check if token is valid token - Token should not be modified & Token should not expire

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Check for hashed token matches with the token in DB & Token Expires time is in the future
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gte: Date.now() },
  });

  if (!user) {
    return next(new AppError('The token is invalid or epired', 404));
  }

  // 2) Update the password in the DB

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save(); // We want validators to run inorder to check if password & confirmpaswword are same - Hence we dont provide validateBeforeSave : false

  // 3) Send the token

  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection

  const user = await User.findById(req.user.id).select('+password');

  if (!req.body.currentPassword || !req.body.newPassword) {
    return next(
      new AppError('Current Password & New Password is required', 404)
    );
  }

  // 2) Check if user posted is correct

  if (!(await user.checkPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect', 403));
  }

  // 3) If so update the pasword
  user.password = req.body.newPassword;
  user.confirmPassword = req.body.confirmPassword;
  await user.save();

  // 4) Log user in - Send Token
  createSendToken(user, 200, req, res);
});
