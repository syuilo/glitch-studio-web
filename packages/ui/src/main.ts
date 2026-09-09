import { createApp } from 'vue';
import '@/style.scss';
import App from '@/App.vue';
import directives from '@/directives/index.ts';
import '@tabler/icons-webfont/dist/tabler-icons.scss';

const app = createApp(App);

directives(app);

app.mount('#app');
