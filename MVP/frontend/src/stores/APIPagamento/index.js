import defaultState from './state';
import actions from './actions';
import getters from './getters';
import mutations from './mutations';

const state = defaultState()

export default{
    namespaced: true, //escopo local, outros modulos podem usar os mesmos nomes (actions,getters..)  
    state,
    mutations,
    actions,
    getters,
};