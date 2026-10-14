/**
 * @author Visakh
 */
import { createOrUpdateConfig } from './utility';

// The form inside the "Create Config" modal (the old config_create template).
// `config` is the word put in front of "Name"; the System Configuration page passes none.
export default function ConfigCreate({ config = '' }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    createOrUpdateConfig(event.target);
  };

  const handleClose = (event) => {
    event.currentTarget.form.reset();
  };

  return (
    <form className="config-add" id="configAdd" onSubmit={handleSubmit}>
      <div className="box box-default box-solid">
        <div className="box-header with-border bg-aqua">
          <h3 className="box-title">Config Details</h3>
        </div>
        <div className="box-body no-padding">
          <div className="row">
            <div className="col-md-4 col-sm-12 col-xs-12">{config} Name <span className="asteric_red">*</span></div>
            <div className="col-md-8 col-sm-12 col-xs-12"><input type="text" minLength="2" pattern="[^-\s][a-zA-Z0-9_\s-]+$" title="Can't starts the field with space" name="name" placeholder={config + ' Name'} required /></div>
          </div>
          <div className="row">
            <div className="col-md-4 col-sm-12 col-xs-12">Value <span className="asteric_red">*</span></div>
            <div className="col-md-8 col-sm-12 col-xs-12"><textarea name="description" className="createTextarea" title="Enter Config Value" placeholder="Enter Config Value" required></textarea></div>
          </div>
        </div>
      </div>
      <button type="submit" name="submit" className="btn btn-primary pull-right">Save {config}</button>
      {' '}
      <button type="button" className="btn btn-default closeConfig" data-dismiss="modal" onClick={handleClose}>Close</button>
    </form>
  );
}
