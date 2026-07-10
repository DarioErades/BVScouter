// router SPA sencillo

class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        this.currentDestroy = null;
    }

    register(name, renderFn) {
        this.routes[name] = renderFn;
    }

    registerDestroy(fn) {
        this.currentDestroy = fn;
    }

    async navigate(pageName, params = {}) {
        if (!this.routes[pageName]) {
            console.error(`Página "${pageName}" no registrada`);
            return;
        }

        if (this.currentDestroy) {
            this.currentDestroy();
            this.currentDestroy = null;
        }

        const content = document.getElementById('content');
        content.innerHTML = '';

        // actualizamos la nav activa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        this.currentPage = pageName;

        // renderizamos la pagina
        await this.routes[pageName](content, params);

        // animacion de entrada
        content.firstElementChild?.classList.add('page-enter');
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

export const router = new Router();
