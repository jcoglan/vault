'use strict'

function sortObject (object) {
  if (!object) return object
  if (typeof object !== 'object') return object
  if (Array.isArray(object)) return object.map(sortObject)

  let copy = {}

  for (let key of Object.keys(object).sort()) {
    copy[key] = sortObject(object[key])
  }

  return copy
}

module.exports = {
  sortObject
}
