const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

/* Before going into the required controller we want to update the header pug template based on the authentication.
 Hence the below middleware is used
authController.isLoggedIn - Will not throw any error in case user is not logged in. The reason is becuase if users visits our application for the first time then we display all the tours page then user clicks on login that time we should not throw any error. Hence the reason
The reason why we dont follow this approach is explained in the below NOTE
router.use(authController.isLoggedIn); // If user is authenticated with cookie available then user object info is made accessible to the header pug template.
 */

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-bookings', authController.protect, viewController.getMyTours);

module.exports = router;

/* 
  NOTE: If we have authController.isLoggedIn as the middleware then
  in that controller we are performing a async operation to get the
  user info.

  Since /me route is only accessible if user is authenticated. Hence
  we allowed the request first to go through the authController.protect
  controller. Which will add the user object on the response & also
  make it available to the pug templates using res.locals
  So, even in protect controller we are performing the async operation
  to get the user object. 

  Here we are performing same operation twice one through isLoggedIn midleware
  and another is going through the necessary route & executing the 
  protect controller. THIS IS BAD OPERATION & CANNOT BE ACCEPTED.


  HENCE WE WILL CHANGE THE APPROACH BY REMOVING THE TOP LEVEL MIDDLEWARE & CHAINING
  THE ISLOGGEDIN MIDDLEWARE


*/
