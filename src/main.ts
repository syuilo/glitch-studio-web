import { createApp } from 'vue';
import '@/style.scss';
import App from '@/App.vue';
import { createPinia } from 'pinia';
import directives from '@/directives/index.js';
import '@tabler/icons-webfont/dist/tabler-icons.scss';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
directives(app);

app.mount('#app');
