import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import get from 'lodash/get'
import reduce from 'lodash/reduce'
import size from 'lodash/size'
import NastLib from 'nast/Lib'
export default class NastStore extends NastLib {
  /**
   * @type {Object}
   * @protected
   */
  static _defaultConfig = {
    saveDepth: 2,
  }
  
  /**
   * @type {Vuex}
   * @protected
   */
  _vuex
  
  /**
   * @type {Vuex}
   * @protected
   */
  _store
  
  /**
   * @type {Object}
   * @protected
   */
  _stores
  
  /**
   * @type {Vue}
   * @protected
   */
  _vue
  
  /**
   * @param {Vue} vue
   * @param {Object} stores
   * @param {Object} config
   */
  constructor(vue, stores, config = {}) {
    super(config)
    this._vue = vue
    this._stores = stores
    this._vuex = Vuex

    this.vuex()
  }
  
  /**
   * @param {string} name
   * @example 'some.nested.module.count'
   *
   * @return {*}
   */
  state(name) {
    return get(this._store.state, name)
  }
  
  /**
   * @param {string} name
   * @example 'some.nested.module.doneTodosCount'
   *
   * @return {*}
   */
  getter(name) {
    return get(this._store.getters, name.split('.').join('/'))
  }
  
  /**
   * @param {string} name
   * @param {*} payload
   *
   * @return {*}
   */
  mutation(name, payload = undefined) {
    return this._store.commit(name.split('.').join('/'), payload)
  }
  
  /**
   * @param {string} name
   * @param {*} payload
   *
   * @return {*}
   */
  action(name, payload = undefined) {
    return this._store.dispatch(name.split('.').join('/'), payload)
  }
  
  /**
   * @param {string} namespace
   * @example 'some/nested/module'
   *
   * @param {Object|Array} mapper
   * @example
   * {
   *   count: (state) => state.count,
   *   countAlias: 'count',
   *   countPlusLocalState(state) {
   *     return state.count + this.localCount
   *   },
   * }
   * OR
   * [ 'count', ]
   *
   * @return {Object}
   */
  mapState(namespace = undefined, mapper = undefined) {
    return this._vuex.mapState(namespace, mapper)
  }
  
  /**
   * @param {string} namespace
   * @example 'some/nested/module'
   *
   * @param {Object|Array} mapper
   * @example
   * { doneCount: 'doneTodosCount', }
   * OR
   * [ 'doneTodosCount', ]
   *
   * @return {Object}
   */
  mapGetters(namespace = undefined, mapper = undefined) {
    return this._vuex.mapGetters(namespace, mapper)
  }
  
  /**
   * @param {string} namespace
   * @example 'some/nested/module'
   *
   * @param {Object|Array} mapper
   * @example
   * { add: 'increment', }
   * OR
   * [ 'increment', ]
   *
   * @return {Object}
   */
  mapMutations(namespace = undefined, mapper = undefined) {
    return this._vuex.mapMutations(namespace, mapper)
  }
  
  /**
   * @param {string} namespace
   * @example 'some/nested/module'
   *
   * @param {Object|Array} mapper
   * @example
   * { add: 'increment', }
   * OR
   * [ 'increment', ]
   *
   * @return {Object}
   */
  mapActions(namespace = undefined, mapper = undefined) {
    return this._vuex.mapActions(namespace)
  }
  
  
  /**
   * @return {Vuex}
   */
  vuex() {
    if (!this._store) {
      this._vue.use(this._vuex)

      const vuexLocal = new VuexPersistence({
        storage: window.localStorage,
        reducer: (state) => {
          return reduce(state, (result, value, key) => {
            const v = this.constructor._reducer(value, 1, this._config('saveDepth'))
            if (v && size(v)) {
              result[key] = v
            }
            return result
          }, {})
        },
      })

      this._store = new this._vuex.Store({
        modules: {
          ...this._stores,
        },
        plugins: [ vuexLocal.plugin, ],
      })
    }
  
    return this._vuex
  }

  /**
   * @return {Vuex}
   */
  store() {
    return this._store
  }
  
  
  /**
   * Reducer, проходит в глубину по полям state и удаляет все значения, которых нет в _save
   *
   * @param {Object} state
   * @param {number} lvl
   * @param {number} maxLvl  Запрещаем ходить слишком глубого, так как использовать _save на вложенных элементах нецелесообразно
   * @return {Object|undefined}
   * @protected
   */
  static _reducer(state, lvl, maxLvl) {
    if (get(state, '_save', false)) {
      return this._removeOthers(state)
    }
    if (lvl > maxLvl) {
      return
    }
    return reduce(state, (result, v, k) => {
      const v2 = this._reducer(v, lvl + 1, maxLvl)
      if (v2 && size(v2)) {
        result[k] = v2
      }
      return result
    }, {})
  }
  
  /**
   * Возвращает state без полей которых нет в _save
   * @param {Object} state
   * @return {Object}
   * @protected
   */
  static _removeOthers(state) {
    const data = reduce(state['_save'], (result, key) => {
      result[key] = state[key]
      return result
    }, {})
    if (size(data)) {
      data['_save'] = state['_save']
    }
    return data
  }
  
}