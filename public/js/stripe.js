/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  try {
    // 1) Initialize stripe object with the public key provided by the stripe
    const stripe = Stripe(
      'pk_test_51JFt8QSCjDtYPElvbsZtH8UiMJH5ijuObjOXuVcqO1F76ptZN9vU2HeCOIG9RX8D0MGo4LES0mihotvLpArdzvnx00rFbNmJXk'
    );

    // 2) Get the stripe checkout session from the server
    const session = await axios({
      method: 'GET',
      url: `/api/v1/bookings/checkout-session/${tourId}`,
    });

    // 3) Create Checkout form & charge the card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(error);
    showAlert('error', err);
  }
};
