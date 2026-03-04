function ensureString(value, methodName, argName = 'value') {
  if (typeof value !== 'string') {
    throw new Error(`decorators.${methodName} expects ${argName} to be a string`)
  }
}

function ensureNumber(value, methodName, argName = 'value') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`decorators.${methodName} expects ${argName} to be a valid number`)
  }
}

function ensureDateLike(value, methodName, argName = 'dateValue') {
  if (value === undefined || value === null) {
    throw new Error(`decorators.${methodName} expects ${argName} to be provided`)
  }
}

function toDate(value, methodName, argName = 'dateValue') {
  ensureDateLike(value, methodName, argName)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`decorators.${methodName} expects ${argName} to be a valid date input`)
  }
  return date
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function pad3(value) {
  return String(value).padStart(3, '0')
}

function formatDateByPattern(date, pattern) {
  const yyyy = String(date.getFullYear())
  const mm = pad2(date.getMonth() + 1)
  const dd = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const mi = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())
  const ms = pad3(date.getMilliseconds())

  return String(pattern)
    .replace(/YYYY/g, yyyy)
    .replace(/MM/g, mm)
    .replace(/DD/g, dd)
    .replace(/HH/g, hh)
    .replace(/mm/g, mi)
    .replace(/ss/g, ss)
    .replace(/SSS/g, ms)
}

function toTitleCase(value) {
  return value.replace(/\w\S*/g, word => {
    const head = word.charAt(0).toUpperCase()
    const rest = word.slice(1).toLowerCase()
    return head + rest
  })
}

function toSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const decoratorsPackage = {
  __priyoHostObject: true,

  // String formatting helpers
  upper(value) {
    ensureString(value, 'upper')
    return value.toUpperCase()
  },

  lower(value) {
    ensureString(value, 'lower')
    return value.toLowerCase()
  },

  trim(value) {
    ensureString(value, 'trim')
    return value.trim()
  },

  title(value) {
    ensureString(value, 'title')
    return toTitleCase(value)
  },

  slug(value) {
    ensureString(value, 'slug')
    return toSlug(value)
  },

  repeat(value, count) {
    ensureString(value, 'repeat')
    ensureNumber(count, 'repeat', 'count')
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('decorators.repeat expects count to be a non-negative integer')
    }
    return value.repeat(count)
  },

  padStart(value, targetLength, fill = ' ') {
    ensureString(value, 'padStart')
    ensureNumber(targetLength, 'padStart', 'targetLength')
    ensureString(fill, 'padStart', 'fill')
    return value.padStart(targetLength, fill)
  },

  padEnd(value, targetLength, fill = ' ') {
    ensureString(value, 'padEnd')
    ensureNumber(targetLength, 'padEnd', 'targetLength')
    ensureString(fill, 'padEnd', 'fill')
    return value.padEnd(targetLength, fill)
  },

  replaceAll(value, searchValue, replaceValue) {
    ensureString(value, 'replaceAll')
    ensureString(searchValue, 'replaceAll', 'searchValue')
    ensureString(replaceValue, 'replaceAll', 'replaceValue')
    if (searchValue.length === 0) {
      throw new Error('decorators.replaceAll expects searchValue to be non-empty')
    }
    return value.split(searchValue).join(replaceValue)
  },

  // Date and time helpers
  nowTimestamp() {
    return Date.now()
  },

  nowISO() {
    return new Date().toISOString()
  },

  today() {
    const date = new Date()
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  },

  timeNow() {
    const date = new Date()
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  },

  format(dateValue, pattern = 'YYYY-MM-DD HH:mm:ss') {
    const date = toDate(dateValue, 'format')
    ensureString(pattern, 'format', 'pattern')
    return formatDateByPattern(date, pattern)
  },

  addDays(dateValue, days) {
    const date = toDate(dateValue, 'addDays')
    ensureNumber(days, 'addDays', 'days')
    date.setDate(date.getDate() + days)
    return date.toISOString()
  },

  addMonths(dateValue, months) {
    const date = toDate(dateValue, 'addMonths')
    ensureNumber(months, 'addMonths', 'months')
    date.setMonth(date.getMonth() + months)
    return date.toISOString()
  },

  addYears(dateValue, years) {
    const date = toDate(dateValue, 'addYears')
    ensureNumber(years, 'addYears', 'years')
    date.setFullYear(date.getFullYear() + years)
    return date.toISOString()
  },

  diffDays(startDate, endDate) {
    const start = toDate(startDate, 'diffDays', 'startDate')
    const end = toDate(endDate, 'diffDays', 'endDate')
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.floor((end.getTime() - start.getTime()) / msPerDay)
  },
}

module.exports = decoratorsPackage
