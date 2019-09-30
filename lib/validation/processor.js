const { queueValidator } = require('./processor/queue.js');

/**
 * This is the core function that carries out validation on a page's data.
 *
 * All validators will be called with a single argument - the current value of
 * the field being validated. If a validator uses options, these are bound to
 * validator function using `Function.bind()`, and thus available as `this`
 * within the validator function.
 *
 * For objects/array fields, use square-braces syntax.
 *
 * Parameters:
 *   string waypointId = The waypoint being validated
 *   object fieldValidators = Validator functions indexed by field name
 *   JourneyContext journeyContext = The full JourneyContext
 *   bool reduceErrors = Reduces each field to a single error (default false)
 *
 * @param {object} params Parameters object as above
 * @return {Promise} Promise
 */
// module.exports = (fieldValidators = {}, userData = {}, options = {}) => {
module.exports = ({
  waypointId, fieldValidators = {}, journeyContext = {}, reduceErrors = false,
} = {}) => {
  // Build up a queue of Promises that will be executed on each field
  const validatorQueue = [];
  Object.keys(fieldValidators).forEach((field) => {
    queueValidator(validatorQueue, waypointId, journeyContext, field, fieldValidators[field]);
  });

  /**
   * Reduce the errors to include only the first error per field. Some fields
   * have multiple validation rules that may each be violated and thus result
   * in their own error messages, which can quickly stack up on larger pages.
   *
   * @param {object} errors All errors
   * @return {object} Reduced error list, indexed by field name
   */
  function reduceGroupedErrors(errors) {
    const reduced = Object.create(null);
    Object.keys(errors).forEach((field) => {
      reduced[field] = [errors[field][0]];
    });
    return reduced;
  }

  /**
   * Gather the array of errors generated by the validation process, into a flat
   * object indexed by the field names. This makes it easier to reference errors
   * in the front-end template.
   *
   * @param  {array} errorsList Array of errors
   * @return {Promise} Promise
   */
  function gatherErrors(errorsList) {
    let grouped = Object.create(null);
    errorsList.forEach((errors) => {
      if (Array.isArray(errors)) {
        errors.forEach((e) => {
          if (!grouped[e.field]) {
            grouped[e.field] = [];
          }
          grouped[e.field].push(e);
        });
      }
    });

    if (reduceErrors) {
      grouped = reduceGroupedErrors(grouped);
    }

    return Object.keys(grouped).length
      ? Promise.reject(grouped)
      : Promise.resolve();
  }

  // Resulting Promise
  if (validatorQueue.length) {
    return Promise.all(validatorQueue).then(gatherErrors);
  }
  return Promise.resolve();
}