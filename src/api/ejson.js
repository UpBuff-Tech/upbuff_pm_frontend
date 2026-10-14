// How dates travel between the browser and the server.
// JSON has no date type, so (like Meteor's EJSON) a Date is sent as {"$date": milliseconds}.
// This way a Date stays a Date on both sides, and a text stays a text.

/** Turns a value into JSON text, writing every Date as {"$date": ms} (and every RegExp as {"$regexp", "$flags"}). */
export function stringify(value) {
  return JSON.stringify(value, function (key, val) {
    // `this[key]` is the original value (JSON.stringify has already turned a Date into a string in `val`).
    const original = this[key];
    if (original instanceof Date) return { $date: original.getTime() };
    // A regular expression (used in search filters) is sent as {"$regexp": source, "$flags": flags}.
    if (original instanceof RegExp) return { $regexp: original.source, $flags: original.flags };
    return val;
  });
}

/** Parses JSON text, turning every {"$date": ms} back into a Date. */
export function parse(text) {
  if (text === '' || text === undefined || text === null) return undefined;
  return JSON.parse(text, (key, val) => {
    if (val && typeof val === 'object' && typeof val.$date === 'number' && Object.keys(val).length === 1) {
      return new Date(val.$date);
    }
    return val;
  });
}
