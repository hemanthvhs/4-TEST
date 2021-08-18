/* eslint-disable */
import axios from 'axios';
import { showAlert, hideAlert } from './alerts';

// Make request to backend regarding the authentication of the user
export const login = async (email, password) => {
  console.log(email, password);
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password,
      },
    });

    // Once user is logged in we want to display him the all tours page
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully !');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500); // After 1.5s we want the user
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
    console.error(err.response.data);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged out successfully !');
      location.reload(); // If we reload then webpage would be served from cache. Instead do hard refresh which will hit the server to the new webpage. But forced relaod location.reload(true) is deprecated. Hence we dont use that
      location.assign('/');
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
    console.error(err.response.data);
  }
};
