// One source of labels/icons for desktop navigation and the mobile menu.
export function setupNavigation(onNavigate) {
  const trigger = document.getElementById('mobileMore');
  const dialog = document.getElementById('mobileMenu');
  const container = dialog.querySelector('.mobile-menu-links');
  document.querySelectorAll('.sidebar > nav > [data-page]').forEach(source => {
    const button = source.cloneNode(true);
    button.removeAttribute('id');
    button.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    button.querySelectorAll('i').forEach(node => node.remove());
    button.dataset.menuPage = button.dataset.page;
    delete button.dataset.page;
    button.type = 'button';
    container.append(button);
  });
  const close = () => dialog.close();
  trigger.addEventListener('click', () => {
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
  });
  dialog.querySelector('[data-close-menu]').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    const button = event.target.closest('[data-menu-page]');
    if (button) { close(); onNavigate(button.dataset.menuPage); }
    else if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }
  });
  dialog.addEventListener('close', () => trigger.setAttribute('aria-expanded', 'false'));
  return {
    setPage(page) {
      document.querySelectorAll('[data-page], [data-menu-page]').forEach(button => {
        const selected = (button.dataset.page || button.dataset.menuPage) === page;
        button.classList.toggle('active', selected);
        if (selected) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      trigger.classList.toggle('active', !['profile', 'friends', 'feed', 'messages'].includes(page));
    }
  };
}
