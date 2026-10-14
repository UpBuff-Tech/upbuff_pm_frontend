import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { globalHelpers } from '../../lib/globalHelpers';
import { forgetEmail } from './utility';

// A React style object cannot hold "!important", so these inline styles are set as text.
const cssText = (text) => (element) => {
  if (element) element.style.cssText = text;
};

export default function ForgetPassword() {
  // Nobody is logged in on this page, so the config values are loaded here.
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    api.call('config.getList', (err, list) => {
      if (!err && list) setConfigs(list);
    });
  }, []);

  const { userName, href, logo, appName } = globalHelpers(configs);

  const submitForgetEmail = (event) => {
    event.preventDefault();
    forgetEmail(event.target);
  };

  if (!userName) return null;
  return (
    <section className="content">
      <div className="login-box" ref={cssText('margin: 10% auto !important;')}>
        <div className="login-logo">
          {href && (
            <a href={href.href_url} target="_blank">
              {logo && (
                <span className="logo-mini"><img src={logo.logo_img} className="mainLogo" /></span>
              )}
              <b>{appName && appName.app}</b>
            </a>
          )}
        </div>
        {/* /.login-logo */}
        <div className="login-box-body">
          <p className="login-box-msg">Can't log in?</p>

          <form className="forget_email" onSubmit={submitForgetEmail}>
            <div className="form-group has-feedback" style={{ marginTop: '20px' }}>
              <label htmlFor="email">We'll send a recovery link to</label>
              <input type="email" className="form-control validation" name="email" placeholder="Enter Email"
                ref={cssText('width:100% !important;')} required />
              <span className="glyphicon glyphicon-envelope form-control-feedback"></span>
            </div>
            <div className="row" ref={cssText('margin-top: 21px !important;margin-right: 0 !important;')}>
              <button type="submit" className="btn btn-primary btn-block btn-flat right-btn">Send recovery link</button>
            </div>
          </form>

          <Link to="/login">Return to log in</Link>


        </div>
        {/* /.login-box-body */}
      </div>
      {/* /.login-box */}
    </section>
  );
}
