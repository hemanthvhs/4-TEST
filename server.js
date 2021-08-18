const mongoose = require('mongoose');
const dotenv = require('dotenv');

// UNHANDLED EXCEPTION

// This should always be at the top before executing any code. The reason is
// because uncaught exceptions are bugs which will make application the not work.
// Hence the application immediately needs to be terminated.
// process.on will set the event listener & if any unhandled exception occurs, we will
// execute the callback function.
// NO GRACEFUL TERMINATION

process.on('uncaughtException', (err) => {
  console.log('UNHANDLED EXCEPTION ! APP SHUTTING DOWN');
  console.log(err);
  console.log(err.name, err.message);
  process.exit(1);
});

// CONFIGURING DOTENV - NODE ENVIRONMENT VARIABLES
/* We need to add the env variables from config.env to node process before
initalizing app. Because we might be using env variables in app & by that time
all custom env variables should be added to the process.env */

dotenv.config({ path: `${__dirname}/config.env` });

const app = require('./app');

// CONFIGURING DATABASE

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB Connection Successful !'));

// LISTENING ON PORT

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('App is listening on PORT-3000');
});

// UNHANDLED REJECTION

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION ! APP SHUTTING DOWN');
  console.log(err);
  console.log(err.name, err.message);

  // GRACEFULLY EXITING THE PROCESS - CLOSE THE SERVER & EXIT PROCESS

  server.close(() => {
    process.exit(1); //  1 => Unhandled Rejection 0 => Success
  });
});

// HEROKU SENDS SIGTERM SIGNAL WHEN THE CONTAINER OR DYNAMO MAKES OUR APLLICATION TO RESTART FOR EVERY 24HRS INORDER TO MAKE OUR APP IN HEALTHY STATE.
// THIS TERMINATED OUR APP ABRUPTLY. INSTEAD WE DO THAT GRACEFULLY AS BELOW

process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('Process Terminated'); // Here we dont need to exit the process as process.ecit(1) becuase SIGTERM signal by iteslf exits the process
  });
});
