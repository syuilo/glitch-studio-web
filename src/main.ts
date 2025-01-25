import { createApp } from 'vue';
import '@/style.scss';
import App from '@/App.vue';
import { createPinia } from 'pinia';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.component('Fa', FontAwesomeIcon);

app.mount('#app');
