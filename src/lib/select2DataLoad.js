// The old imports/startup/client/select2DataLoad.js: fills a select2 dropdown from an array,
// 20 rows at a time, with search.

export const select2DataLoad = (dataArray, type, className) => {
  let items = dataArray;
  const pageSize = 20;
  if (type === 'Invoice' || type === 'inventoryTransfer') {
    items = $.map(items, function (obj) {
      obj.id = obj.id || obj._id;
      obj.text = obj.text || obj.docNum;
      return obj;
    });
  } else if (type === 'Client') {
    items = $.map(items, function (obj) {
      obj.id = obj._id;
      obj.text = obj.name + (obj.clientId ? ' (' + obj.clientId + ')' : '');
      return obj;
    });
  } else if (type === 'Project') {
    items = $.map(items, function (obj) {
      obj.id = obj._id;
      obj.text = obj.name;
      return obj;
    });
  } else if (type === 'User') {
    items = $.map(items, function (obj) {
      const first = obj.profile && obj.profile.firstName ? obj.profile.firstName : '';
      const last = obj.profile && obj.profile.lastName ? obj.profile.lastName : '';
      const fullName = (first + ' ' + last).trim();
      obj.id = obj._id;
      obj.text = fullName || (obj.emails && obj.emails[0] && obj.emails[0].address) || obj.username || obj._id;
      return obj;
    });
  }
  jQuery.fn.select2.amd.require(['select2/data/array', 'select2/utils'], function (ArrayData, Utils) {
    function CustomData($element, options) {
      CustomData.__super__.constructor.call(this, $element, options);
    }
    Utils.Extend(CustomData, ArrayData);
    CustomData.prototype.query = function (params, callback) {
      let results = [];
      if (params.term && params.term !== '') {
        results = items.filter((e) => e.text.toUpperCase().indexOf(params.term.toUpperCase()) >= 0);
      } else {
        results = items;
      }
      if (!('page' in params)) {
        params.page = 1;
      }
      const data = {};
      data.results = results.slice((params.page - 1) * pageSize, params.page * pageSize);
      data.pagination = {};
      data.pagination.more = params.page * pageSize < results.length;
      callback(data);
    };
    $(document).ready(function () {
      $(className).select2({
        ajax: {},
        dataAdapter: CustomData,
        placeholder: $(className).attr('placeholder') || $(className).find('option[value=""]').text() || 'Select',
        allowClear: true,
        dropdownParent: $(className).parent(),
      });
    });
  });
};
