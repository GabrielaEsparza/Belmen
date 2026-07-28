/* ==========================================================================
   BELMEN — script.js
   ==========================================================================
   Todo el sitio es una sola página (index.html) con anclas (#nosotros,
   #colecciones, etc.). Este archivo solo maneja comportamiento de
   interfaz, sin backend ni base de datos:

   1. Quitar la clase "no-js" del <body> (ver css/styles.css → sección 5)
   2. Header con sombra al hacer scroll
   3. Menú móvil (hamburguesa)
   4. Filtro de categorías en "Colecciones"
   5. Animación "reveal" al hacer scroll (IntersectionObserver)
   6. Modal de producto → abre cada tarjeta del catálogo en grande
   7. Formulario de contacto → arma un link de WhatsApp con los datos
      capturados y lo abre (NO envía nada a un servidor, no hay compra)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ------------------------------------------------------------------------
     1. Quitar "no-js": así el CSS sabe que puede usar las animaciones
        de .reveal en vez de mostrar todo visible de inmediato.
     ------------------------------------------------------------------------ */
  document.body.classList.remove('no-js');


/* ------------------------------------------------------------------------
   2. Header: fondo navy gradual + sombra al hacer scroll
   ------------------------------------------------------------------------ */
var header = document.getElementById('header');
var SCROLL_THRESHOLD = 12;   // px antes de activar la sombra/borde
var FADE_DISTANCE = 240;     // px de scroll para llegar a navy-900 sólido

function updateHeaderState() {
  var scrollY = window.scrollY;

  // Progreso de 0 a 1 según cuánto se ha scrolleado (limitado a FADE_DISTANCE)
  var progress = Math.min(scrollY / FADE_DISTANCE, 1);
  header.style.setProperty('--header-scroll', progress);

  if (scrollY > SCROLL_THRESHOLD) {
    header.classList.add('is-scrolled');
  } else {
    header.classList.remove('is-scrolled');
  }
}

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });
  /* ------------------------------------------------------------------------
     3. Menú móvil
     ------------------------------------------------------------------------ */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');

  function closeMenu() {
    nav.classList.remove('nav--open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú');
  }

  function toggleMenu() {
    var isOpen = nav.classList.toggle('nav--open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  }

  navToggle.addEventListener('click', toggleMenu);

  // Cerrar el menú móvil al elegir un link de navegación
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });


  /* ------------------------------------------------------------------------
     4. Catálogo: filtro por categoría + buscador
        Cada botón .filters__btn trae data-filter="categoria".
        Cada tarjeta .product-card trae data-category="categoria".
        "todos" muestra todas las tarjetas. El buscador (#catalogSearch)
        se combina con el filtro activo: una tarjeta solo se muestra si
        cumple AMBAS condiciones (categoría Y texto buscado).
     ------------------------------------------------------------------------ */
  var filterButtons = document.querySelectorAll('.filters__btn');
  var productCards = document.querySelectorAll('.product-card');
  var searchInput = document.getElementById('catalogSearch');
  var catalogEmpty = document.getElementById('catalogEmpty');
  var currentCategory = 'todos';

  function applyFilter(category) {
    currentCategory = category;

    filterButtons.forEach(function (btn) {
      var isActive = btn.dataset.filter === category;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    refreshProductGrid();
  }

  function refreshProductGrid() {
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var visibleCount = 0;

    productCards.forEach(function (card) {
      var matchesCategory = currentCategory === 'todos' || card.dataset.category === currentCategory;

      var nameEl = card.querySelector('.product-card__name');
      var name = nameEl ? nameEl.textContent.toLowerCase() : '';
      var matchesQuery = query === '' || name.indexOf(query) !== -1;

      var matches = matchesCategory && matchesQuery;
      card.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    if (catalogEmpty) {
      catalogEmpty.hidden = visibleCount !== 0;
    }
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.dataset.filter);
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', refreshProductGrid);
  }

  // Los links del footer ("Escolares", "Deportivos"...) también filtran
  // el catálogo al llegar a la sección, usando el mismo data-filter.
  document.querySelectorAll('[data-filter-link]').forEach(function (link) {
    link.addEventListener('click', function () {
      applyFilter(link.dataset.filterLink);
    });
  });

  // Las tarjetas de categoría ("Ver modelos") aplican el filtro
  // correspondiente y llevan la vista directo al grid de productos.
  document.querySelectorAll('.category-card__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.dataset.filter);
      var grid = document.getElementById('productGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  /* ------------------------------------------------------------------------
     5. Animación "reveal" al hacer scroll
        Cualquier elemento con la clase .reveal se anima suavemente hacia
        arriba y aparece cuando entra en pantalla. Una sola vez por elemento.
     ------------------------------------------------------------------------ */
  var revealTargets = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    revealTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Navegadores muy viejos sin soporte: mostrar todo directo
    revealTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }


  /* ------------------------------------------------------------------------
     6. Modal de producto
        Al hacer clic (o Enter/Espacio) en una tarjeta de "Colecciones",
        se abre un modal con la información de esa tarjeta en grande.
        Un solo modal en el DOM se reutiliza y se rellena con los datos
        leídos directamente del HTML de la tarjeta — así el contenido
        del modal nunca se desincroniza del contenido de la tarjeta.
     ------------------------------------------------------------------------ */
  var modal = document.getElementById('productModal');
  var modalImage = document.getElementById('productModalImage');
  var modalBadge = document.getElementById('productModalBadge');
  var modalTitle = document.getElementById('productModalTitle');
  var modalMeta = document.getElementById('productModalMeta');
  var modalDesc = document.getElementById('productModalDesc');
  var lastFocusedElement = null;

  function openProductModal(card) {
    var img = card.querySelector('.product-card__media img');
    var badge = card.querySelector('.badge');
    var name = card.querySelector('.product-card__name');
    var metaRows = card.querySelectorAll('.product-card__meta-row');

    modalImage.src = img.src;
    modalImage.alt = img.alt;

    if (badge) {
      modalBadge.textContent = badge.textContent;
      modalBadge.className = 'badge ' + badge.className.replace('badge', '').trim();
      modalBadge.hidden = false;
    } else {
      modalBadge.hidden = true;
    }

    modalTitle.textContent = name.textContent;

    modalMeta.innerHTML = '';
    metaRows.forEach(function (row) {
      var clone = row.cloneNode(true);
      clone.classList.remove('product-card__meta-row');
      clone.classList.add('product-modal__meta-row');
      clone.querySelector('span').classList.remove('product-card__meta-label');
      clone.querySelector('span').classList.add('product-modal__meta-label');
      modalMeta.appendChild(clone);
    });

    modalDesc.textContent = card.dataset.description || '';

    lastFocusedElement = document.activeElement;
    modal.classList.add('product-modal--open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    modal.querySelector('.product-modal__close').focus();
  }

  function closeProductModal() {
    modal.classList.remove('product-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  productCards.forEach(function (card) {
    card.addEventListener('click', function (event) {
      // No abrir el modal si el clic fue sobre el link "Solicitar cotización":
      // ese link ya lleva directo a #contacto y no debe competir con el modal.
      if (event.target.closest('.product-card__cta')) return;
      openProductModal(card);
    });

    // Accesibilidad: las tarjetas son focuseables (tabindex="0" en el HTML),
    // así que también se abren con teclado.
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.target.closest('.product-card__cta')) return;
        event.preventDefault();
        openProductModal(card);
      }
    });
  });

  modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
    el.addEventListener('click', closeProductModal);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('product-modal--open')) {
      closeProductModal();
    }
  });


  /* ------------------------------------------------------------------------
     7. Formulario de contacto → WhatsApp
        No hay checkout ni base de datos: el formulario arma un mensaje de
        texto con los datos capturados y abre WhatsApp Web / la app con
        ese mensaje ya escrito, para que el equipo de Belmen lo reciba
        directo en su chat.

        IMPORTANTE: reemplaza WHATSAPP_NUMBER por el número real de Belmen
        en formato internacional SIN signos ni espacios (52 + 10 dígitos).
     ------------------------------------------------------------------------ */
  var WHATSAPP_NUMBER = '5213300000000'; // TODO: reemplazar con el número real

  var contactForm = document.getElementById('contactForm');

  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var nombre = contactForm.nombre.value.trim();
    var empresa = contactForm.empresa.value.trim();
    var ciudad = contactForm.ciudad.value.trim();
    var whatsapp = contactForm.whatsapp.value.trim();

    if (!nombre || !whatsapp) {
      contactForm.reportValidity();
      return;
    }

    var lineas = [
      'Hola Belmen, quiero solicitar el catálogo mayorista.',
      'Nombre: ' + nombre
    ];
    if (empresa) lineas.push('Empresa / institución: ' + empresa);
    if (ciudad) lineas.push('Ciudad: ' + ciudad);
    lineas.push('Mi WhatsApp: ' + whatsapp);

    var mensaje = encodeURIComponent(lineas.join('\n'));
    var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + mensaje;

    window.open(url, '_blank', 'noopener');
  });


  /* ------------------------------------------------------------------------
     8. Sección "Personalización" → pestañas de técnicas
        Cada botón .custom-tab trae data-image y data-caption. Al hacer
        clic, esos datos se copian al panel de la derecha (imagen +
        descripción) y se marca la pestaña como activa.
     ------------------------------------------------------------------------ */
  var customTabs = document.querySelectorAll('.custom-tab');
  var customPreviewImage = document.getElementById('customPreviewImage');
  var customPreviewLabel = document.getElementById('customPreviewLabel');
  var customPreviewDesc = document.getElementById('customPreviewDesc');

  function setActiveTab(tab) {
    customTabs.forEach(function (btn) {
      var isActive = btn === tab;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    var name = tab.querySelector('.custom-tab__name');

    if (customPreviewImage) customPreviewImage.src = tab.dataset.image;
    if (customPreviewImage) customPreviewImage.alt = 'Muestra de ' + (name ? name.textContent : 'personalización');
    if (customPreviewLabel && name) customPreviewLabel.textContent = name.textContent;
    if (customPreviewDesc) customPreviewDesc.textContent = tab.dataset.caption;
  }

  customTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setActiveTab(tab);
    });
  });

});