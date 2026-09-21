// Router mínimo: cada vista se registra con su nombre y `mount(root, params)`.
const views = {};
export const nav = { view: 'home', id: null };

export const register = (name, mount) => { views[name] = mount; };

export function go(view, id = null) {
  nav.view = view;
  nav.id = id;
  document.getElementById('app').innerHTML = '';
  views[view](document.getElementById('app'), nav);
}
