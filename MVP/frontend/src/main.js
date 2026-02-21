//necessário para iniciar vue, ponto de entrada do js, cria uma instancia do vue, importa o componente raiz (app.vue),o roter, a store e monta a aplicacao no elemento #app do index.html 
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
//createApp é funcao do vue que instancia a aplicacao, permite que vue seja inicializado,recebe o componente raiz app e permite enadear o uso de pluggins (router, store...) antes de montar o DOM (interface de programação que representa páginas HTML)

//chamo router e store pois: eles são plugins que aplicação precisa para funcionar, o router gerencia a navegação entre telas, store (Vuex/Pinia) gerencia o estado global (dados compartilhados) e o método .use() é a maneira de "instalar" esses plugins na aplicação Vue .
