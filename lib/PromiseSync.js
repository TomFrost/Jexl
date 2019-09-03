/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

class PromiseSync {
  constructor(fn) {
    fn(this._resolve.bind(this), this._reject.bind(this))
  }

  catch(rejected) {
    if (this.error) {
      try {
        this._resolve(rejected(this.error))
      } catch (e) {
        this._reject(e)
      }
    }
    return this
  }

  then(resolved, rejected) {
    if (!this.error) {
      try {
        this._resolve(resolved(this.value))
      } catch (e) {
        this._reject(e)
      }
    }
    if (rejected) this.catch(rejected)
    return this
  }

  _reject(error) {
    this.value = undefined
    this.error = error
  }

  _resolve(val) {
    if (val instanceof PromiseSync) {
      if (val.error) {
        this._reject(val.error)
      } else {
        this._resolve(val.value)
      }
    } else {
      this.value = val
      this.error = undefined
    }
  }
}

PromiseSync.all = vals =>
  new PromiseSync(resolve => {
    const resolved = vals.map(val => {
      while (val instanceof PromiseSync) {
        if (val.error) throw Error(val.error)
        val = val.value
      }
      return val
    })
    resolve(resolved)
  })

PromiseSync.resolve = val => new PromiseSync(resolve => resolve(val))

PromiseSync.reject = error =>
  new PromiseSync((resolve, reject) => reject(error))

module.exports = PromiseSync
