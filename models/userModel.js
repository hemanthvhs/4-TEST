const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please tell your name'] },
  email: {
    type: String,
    unique: true,
    lowerCase: true,
    required: [true, 'Please provide your email'],
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    default: 'user',
    enum: { values: ['user', 'admin', 'guide', 'lead-guide'] },
  },
  password: {
    type: String,
    required: [true, 'Please provide your password'],
    minLength: [8, 'Password should be minimum of 8 characters'],
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, 'Please provide your confirm password'],
    validate: {
      // These validator functions run only on SAVE & CREATE only
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords does not match',
    },
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
});

// DOCUMENT MIDDLEWARE - TO HASH THE PASSWORDS & SAVE IN DB

userSchema.pre('save', async function (next) {
  // HASHING PASSWORDS ONLY WHEN PASSWORD IS MODIFIED
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12); // Higher the salt number, higher the time taken to hash the password
  this.confirmPassword = undefined;

  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // The reason for substracting 1Second is becuase some times JWT is issued first than doc saving in DB with passwordChangedAt time bit in future.

  next();
});

// QUERY MIDDLEWARE - TO REMOVE ALL INACTIVE USERS BFEFORE EXECUTING .find()
// Scenario - Lets say if user visists /deleteMe route & requests for delete. Then active property for that user will be set to false.
// Now, lets say if user try to login then using findOne({email}) we will get the user details. But before doing that we will using our query middleware which will filters only the users whose active is set to true. Hence user will not be found.
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } }); // This refers to current query
  next();
});

// INSTANCE METHOD - TO VALIDATE THE PASSWORD

userSchema.methods.checkPassword = async function (
  enteredPassword,
  actualPassword
) {
  return await bcrypt.compare(enteredPassword, actualPassword);
};

// INSTANCE METHOD - TO CHECK IF USER CHANGED PASSWORD AFTER JWT ISSSUED

userSchema.methods.changedPasswordAfter = function (JWTExpiresInTime) {
  if (this.passwordChangedAt) {
    const passwordChangedAtTime = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTExpiresInTime < passwordChangedAtTime;
  }

  return false; // FALSE means not changed
};

// INSTANCE METHOD - TO GENERATE THE PASSWORD RESET TOKEN & ENCRYPTING THE TOKEN
// Reset token - Sending to users email
// Encrypted token - Save it in DB (If some hacker gains access to db & reset token then he can change the password. Hence encrypt & save it in DB)

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000; // 10 Min - converting to milliseconds
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
