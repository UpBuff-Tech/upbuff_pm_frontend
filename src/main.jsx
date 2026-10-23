import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { setupStackedModals } from './lib/stackedModals';
import './styles/datepicker3.css';
import './styles/daterangepicker.css';
import './styles/main.css';
import './styles/theme.css';
import './components/skeleton/skeleton.css';
import './components/detailModal/detailModal.css';

setupStackedModals();

// Success / error / info pop-ups (styled in styles/theme.css): newest on top, a close button and a
// thin line counting down until the pop-up closes.
toastr.options = {
  ...toastr.options,
  positionClass: 'toast-top-right',
  newestOnTop: true,
  closeButton: true,
  progressBar: true,
  timeOut: 4000,
  extendedTimeOut: 1500,
  showDuration: 150,
  hideDuration: 200,
};

// The old body.js: hide a leftover modal backdrop when the user presses Back.
$(window).on('popstate', function () {
  $('.modal-backdrop').css('display', 'none');
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
