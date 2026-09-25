// Sezione Condizioni: lista espandibile. La tab e' visibile solo se esistono dati
// (gestito in app.js/updateTabs); qui gestiamo comunque il caso vuoto per sicurezza.
import { el, ICON, fold, debounce } from '../util.js';

export function renderConditions(root, api) {
  const { state } = api;
  root.innerHTML = '';

  if (!state.conditions.length) {
    root.appendChild(emptyState());
    return;
  }

  const searchWrap = el('div', { class: 'search-wrap' });
  const search = el('input', { class: 'input', type: 'search', placeholder: 'Cerca condizione…', 'aria-label': 'Cerca condizione' });
  searchWrap.appendChild(el('div', { class: 'row' }, [search]));
  root.appendChild(searchWrap);

  const count = el('div', { class: 'result-count' });
  root.appendChild(count);

  const list = el('div', {});
  root.appendChild(list);

  function draw(q) {
    const f = fold(q);
    const items = f ? state.conditions.filter((c) => c.search.includes(f)) : state.conditions;
    count.textContent = `${items.length} condizion${items.length === 1 ? 'e' : 'i'}`;
    list.innerHTML = '';
    for (const c of items) list.appendChild(accItem(c));
    if (!items.length) list.appendChild(el('div', { class: 'empty', text: 'Nessuna condizione corrisponde alla ricerca.' }));
  }

  search.addEventListener('input', debounce(() => draw(search.value), 120));
  draw('');

  function accItem(c) {
    const item = el('div', { class: 'acc-item' });
    const head = el('div', { class: 'acc-head' }, [
      el('span', { class: 'title', text: c.name }),
      c.original ? el('span', { class: 'en', text: c.original }) : null,
      el('span', { class: 'caret', html: ICON.caret })
    ]);
    const body = el('div', { class: 'acc-body' }, [
      el('p', { text: c.description || '—' })
    ]);
    head.addEventListener('click', () => item.classList.toggle('open'));
    item.append(head, body);
    return item;
  }

  function emptyState() {
    return el('div', { class: 'empty' }, [
      el('div', { html: ICON.sparkle }),
      el('strong', { text: 'Nessuna condizione importata.' }),
      el('div', { class: 'muted', text: 'Importa un CSV dalla scheda Impostazioni.' })
    ]);
  }
}
