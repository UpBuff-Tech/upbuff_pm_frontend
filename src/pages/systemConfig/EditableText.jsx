// Inline "click the text to edit it" field: the {{> editableText options=... field="value"}} widget
// of the old babrahams:editable-text package, for one text field of a document.
//
//   <EditableText context={config} field="value" options={globalOptionsHelper('config')} />
//
// options = { collection, acceptEmpty, substitute, eventType }:
//   eventType   'dblclick' or 'click' - what opens the text for editing
//   substitute  html shown instead of the text while the field is empty
//   acceptEmpty false = an emptied input is not saved (same as pressing Esc)
// Enter or leaving the input saves, Esc cancels.

import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import './editableText.css';

function removeEntities(html) {
  return $.trim(html.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&nbsp;/g, ' '));
}

export default function EditableText({ context, field, options }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  // True once Enter or Esc has closed the input, so that the blur that follows does not save again.
  const closed = useRef(false);

  const value = context[field];
  const eventType = options.eventType || 'click';

  // Opening the input: put the cursor in it with the whole text selected.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEditing = () => {
    closed.current = false;
    setEditing(true);
  };

  const stopEditing = () => {
    closed.current = true;
    setEditing(false);
  };

  // Writes the new text to the document, unless nothing was changed.
  const makeUpdate = (typedValue) => {
    let currentValue = (typeof value === 'string' && value.replace(/ \/>/g, '>')) || '';
    currentValue = removeEntities(currentValue);
    const newValue = removeEntities(typedValue.replace(/mml:/g, ''));

    if (newValue !== currentValue && (newValue || options.acceptEmpty)) {
      // The widget's own server method. It strips html tags from the text and then does
      //   <options.collection>.update({ _id: context._id }, { $set: { [field]: text } })
      const data = { ...options, options, context, field };
      api.call('_editableTextWrite', 'update', data, { $set: { [field]: newValue } }, false, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
  };

  // blur/return/enter = save if non-empty, otherwise cancel
  const saveOrCancel = (event) => {
    const typedValue = $.trim(String(event.target.value || ''));
    if (typedValue || options.acceptEmpty) {
      makeUpdate(typedValue);
    }
    stopEditing();
  };

  const handleKeyDown = (event) => {
    if (event.keyCode === 27) { // escape = cancel
      stopEditing();
    }
    else if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      saveOrCancel(event);
    }
  };

  const handleBlur = (event) => {
    if (closed.current) return;
    saveOrCancel(event);
  };

  if (editing) {
    return (
      <input className="wide-text-edit " type="text" ref={inputRef} placeholder=""
        defaultValue={(value && value.toString()) || ''} onKeyDown={handleKeyDown} onBlur={handleBlur} />
    );
  }

  const spanProps = {
    className: `editable-text  et-${context._id}-${field}`,
    title: (eventType === 'dblclick' ? 'double click' : 'click') + ' to edit',
    onClick: eventType === 'click' ? startEditing : undefined,
    onDoubleClick: eventType === 'dblclick' ? startEditing : undefined,
  };

  // Empty field: show the substitute (a pencil icon) to click on.
  if (!value && options.substitute) {
    return <span {...spanProps} dangerouslySetInnerHTML={{ __html: options.substitute }}></span>;
  }

  const content = typeof value === 'string' ? value : ((value || value === 0) ? value.toString() : '');
  return <span {...spanProps}>{content}</span>;
}
