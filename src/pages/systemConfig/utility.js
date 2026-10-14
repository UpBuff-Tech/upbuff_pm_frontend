/**
 * @author Visakh
 */
import api from '../../api/client';
import { getCurrentUser } from '../../auth/AuthContext';

/**
 * Saves the "Create Config" form.
 * @param target   the form element
 * @param id
 */
export const createOrUpdateConfig = (target, id) => {
  const name = target.name;
  const description = target.description;
  const username = getCurrentUser().username;

  api.call('config.createOrUpdate', id, name.value, description.value, username, (err) => {
    if (err) {
      $('#configErrorModal').modal();
      $('#configErrorModal').find('.modal-body').text(err.reason);
    }
    else {
      $('#configSuccessModal').modal();
      target.name.value = '';
      target.description.value = '';
    }
    $('#config-create').modal('hide');
  });
};
