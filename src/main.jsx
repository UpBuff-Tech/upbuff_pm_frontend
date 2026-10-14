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
